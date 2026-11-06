import { createElement as h, useEffect, useRef, useState } from "react";
import type { ReactElement, RefObject } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import type { ITheme } from "@xterm/xterm";
import { ResizeTerminalCommand, StartTerminalCommand, TerminalOutputQuery, TypeTerminalCommand } from "@sumi/contract";
import type { TerminalOutput, TerminalSize } from "@sumi/contract";
import type { Answer, StartedApp } from "@widgetarium/data-framework";
import type { SumiShell } from "../sumi-shell.js";
import { TERMINAL_SHEET } from "./terminal-sheet.js";

const SHEET_ID = "wg-terminal-sheet";
const FONT_SIZE = 13;
const LINE_HEIGHT = 1.25;
const SCROLLBACK = 10_000;
const EXITED = "Exited";
const EXITED_WITH = "Exited with {code}";

// TRADE-OFF: ANSI colours are terminal data, not UI tokens; Sumi has no 16-colour scale
const LIGHT_ANSI: ITheme = {
	black: "#1d1d1f",
	red: "#c9372c",
	green: "#2f8f5b",
	yellow: "#a46a00",
	blue: "#2e4fe6",
	magenta: "#9b3fc4",
	cyan: "#1a7f93",
	white: "#8e8e93",
	brightBlack: "#6e6e73",
	brightRed: "#d93f2e",
	brightGreen: "#38a169",
	brightYellow: "#c98a00",
	brightBlue: "#3b5bfd",
	brightMagenta: "#b04fd8",
	brightCyan: "#2196ad",
	brightWhite: "#3a3a3c",
};

const DARK_ANSI: ITheme = {
	black: "#3a3a3c",
	red: "#ff6b5e",
	green: "#5fd38d",
	yellow: "#f2c14e",
	blue: "#7d95ff",
	magenta: "#d08cff",
	cyan: "#5fd1e8",
	white: "#d1d1d6",
	brightBlack: "#8e8e93",
	brightRed: "#ff8a80",
	brightGreen: "#7ee2a5",
	brightYellow: "#ffd76e",
	brightBlue: "#9cadff",
	brightMagenta: "#e0a8ff",
	brightCyan: "#86e1f2",
	brightWhite: "#ffffff",
};

export interface TerminalPageProps {
	readonly sumi: SumiShell;
	readonly isDark: boolean;
}

interface OutputRead {
	readonly output: TerminalOutput | null;
	readonly failure: string | null;
}

export function TerminalPage({ sumi, isDark }: TerminalPageProps): ReactElement {
	const screen = useRef<HTMLDivElement>(null);
	const terminal = useScreenIn(screen);
	const read = useTerminalOutput(sumi);
	const shellRefusal = useWiresShell(terminal, sumi.shell);
	const failure = read.failure ?? shellRefusal;
	useDrawsOutput(terminal, read.output);
	useThemesScreen(screen, terminal, isDark);
	return (
		<div className="wg-terminal">
			<div ref={screen} className="wg-terminal-screen" />
			{read.output?.status === "exited" ? <p className="wg-terminal-note">{exitedOf(read.output)}</p> : null}
			{failure === null ? null : <p className="wg-terminal-note">{failure}</p>}
		</div>
	);
}

function useThemesScreen(
	screen: RefObject<HTMLDivElement | null>,
	terminal: RefObject<Terminal | null>,
	isDark: boolean,
): void {
	useEffect(() => {
		const host = screen.current;

		if (terminal.current === null || host === null) {
			return;
		}

		terminal.current.options.theme = themeOf(host, isDark);
	}, [screen, terminal, isDark]);
}

function useTerminalOutput({ shell, transport }: SumiShell): OutputRead {
	const [read, setRead] = useState<OutputRead>({
		output: null,
		failure: null,
	});
	useEffect(() => {
		let lastAsked = 0;
		const reread = (): void => {
			lastAsked += 1;
			const asked = lastAsked;
			void shell.send(TerminalOutputQuery).then((answer) => {
				if (asked !== lastAsked) {
					return;
				}

				setRead(
					answer.ok
						? {
								output: answer.output,
								failure: null,
							}
						: (held) => ({
								output: held.output,
								failure: answer.reason,
							}),
				);
			});
		};
		reread();
		return transport.changes(reread);
	}, [shell, transport]);
	return read;
}

function useWiresShell(terminal: RefObject<Terminal | null>, shell: StartedApp): string | null {
	const [refusal, setRefusal] = useState<string | null>(null);
	useEffect(() => {
		const drawn = terminal.current;

		if (drawn === null) {
			return;
		}

		const showRefusalOf = (answer: Answer<unknown>): void => setRefusal(answer.ok ? null : answer.reason);
		void shell.send(StartTerminalCommand, sizeOf(drawn)).then(showRefusalOf);
		const typing = drawn.onData((keys) => void shell.send(TypeTerminalCommand, { keys }).then(showRefusalOf));
		const resizing = drawn.onResize((size) => void shell.send(ResizeTerminalCommand, size).then(showRefusalOf));
		return () => {
			typing.dispose();
			resizing.dispose();
		};
	}, [terminal, shell]);
	return refusal;
}

function sizeOf({ cols, rows }: Terminal): TerminalSize {
	return {
		cols,
		rows,
	};
}

function useDrawsOutput(terminal: RefObject<Terminal | null>, output: TerminalOutput | null): void {
	const written = useRef("");
	useEffect(() => {
		const drawn = terminal.current;

		if (drawn === null || output === null) {
			return;
		}

		if (output.output.startsWith(written.current)) {
			drawn.write(output.output.slice(written.current.length));
		} else {
			drawn.reset();
			drawn.write(output.output);
		}

		written.current = output.output;
	}, [terminal, output]);
}

function useScreenIn(screen: RefObject<HTMLDivElement | null>): RefObject<Terminal | null> {
	const terminal = useRef<Terminal | null>(null);
	useEffect(() => {
		const host = screen.current;

		if (host === null) {
			return;
		}

		layTerminalSheet();
		const started = new Terminal({
			fontFamily: cssValueOf(host, "--sumi-font-mono"),
			fontSize: FONT_SIZE,
			lineHeight: LINE_HEIGHT,
			cursorBlink: false,
			scrollback: SCROLLBACK,
			allowProposedApi: true,
		});
		const fit = new FitAddon();
		started.loadAddon(fit);
		started.open(host);
		fit.fit();
		started.focus();
		const resized = new ResizeObserver(() => fit.fit());
		resized.observe(host);
		terminal.current = started;
		return () => {
			resized.disconnect();
			started.dispose();
			terminal.current = null;
		};
	}, [screen]);
	return terminal;
}

function exitedOf({ exitCode }: TerminalOutput): string {
	return exitCode === null ? EXITED : EXITED_WITH.replace("{code}", String(exitCode));
}

function themeOf(host: HTMLElement, isDark: boolean): ITheme {
	const background = cssValueOf(host, "--sumi-plate");
	const foreground = cssValueOf(host, "--sumi-text");
	return {
		...(isDark ? DARK_ANSI : LIGHT_ANSI),
		background,
		foreground,
		cursor: foreground,
		cursorAccent: background,
		selectionBackground: cssValueOf(host, "--sumi-accent-soft"),
	};
}

function cssValueOf(host: HTMLElement, name: string): string {
	return getComputedStyle(host).getPropertyValue(name).trim();
}

function layTerminalSheet(): void {
	if (document.getElementById(SHEET_ID) !== null) {
		return;
	}

	const sheet = document.createElement("style");
	sheet.id = SHEET_ID;
	sheet.textContent = TERMINAL_SHEET;
	document.head.append(sheet);
}
