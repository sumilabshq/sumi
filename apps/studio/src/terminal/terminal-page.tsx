import { createElement as h, useEffect, useRef } from "react";
import type { ReactElement, RefObject } from "react";
import { Channel, invoke, isTauri } from "@tauri-apps/api/core";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import type { ITheme } from "@xterm/xterm";
import { TERMINAL_SHEET } from "./terminal-sheet.js";
import { TerminalUnavailable } from "./terminal-unavailable.js";

const SHEET_ID = "wg-terminal-sheet";
const FONT_SIZE = 13;
const LINE_HEIGHT = 1.25;
const SCROLLBACK = 10_000;
const DARK_LUMINANCE_BELOW = 0.5;
const EXITED = "\r\n[process exited]\r\n";
const NOT_UNDERSTOOD = "[widgetarium] the terminal said something that is neither bytes nor an exit";

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

export function TerminalPage(): ReactElement {
	const screen = useRef<HTMLDivElement>(null);
	useShellIn(screen);

	if (!isTauri()) {
		return <TerminalUnavailable />;
	}

	return (
		<div className="wg-terminal">
			<div ref={screen} className="wg-terminal-screen" />
		</div>
	);
}

function useShellIn(screen: RefObject<HTMLDivElement | null>): void {
	useEffect(() => {
		const host = screen.current;

		if (host === null) {
			return;
		}

		layTerminalSheet();
		return startShell(host);
	}, [screen]);
}

function startShell(host: HTMLDivElement): () => void {
	const terminal = new Terminal({
		fontFamily: cssValueOf(host, "--sumi-font-mono"),
		fontSize: FONT_SIZE,
		lineHeight: LINE_HEIGHT,
		cursorBlink: true,
		scrollback: SCROLLBACK,
		allowProposedApi: true,
		macOptionIsMeta: true,
		theme: themeOf(host),
	});
	const fit = new FitAddon();
	terminal.loadAddon(fit);
	terminal.open(host);
	fit.fit();
	const session = openSession(terminal);
	terminal.attachCustomKeyEventHandler((event) => {
		const isClear = event.type === "keydown" && event.metaKey && event.key === "k";

		if (isClear) {
			terminal.clear();
		}

		return !isClear;
	});
	terminal.onData((data) => void session.then((id) => invoke("plugin:terminal|write", { id, data })));
	terminal.onResize(
		({ cols, rows }) => void session.then((id) => invoke("plugin:terminal|resize", { id, cols, rows })),
	);
	const resized = new ResizeObserver(() => fit.fit());
	resized.observe(host);
	const scheme = matchMedia("(prefers-color-scheme: dark)");
	const retheme = (): void => {
		terminal.options.theme = themeOf(host);
	};
	scheme.addEventListener("change", retheme);
	terminal.focus();
	return () => {
		scheme.removeEventListener("change", retheme);
		resized.disconnect();
		void session.then((id) => invoke("plugin:terminal|close", { id }));
		terminal.dispose();
	};
}

function openSession(terminal: Terminal): Promise<number> {
	const onData = new Channel<unknown>();
	onData.onmessage = (said) => {
		const shown = shownOf(said);

		if (shown === null) {
			console.error(NOT_UNDERSTOOD, said);
			return;
		}

		terminal.write(shown);
	};
	const opened = invoke<number>("plugin:terminal|open", {
		cols: terminal.cols,
		rows: terminal.rows,
		onData,
	});
	opened.catch((error: unknown) => {
		console.error("[widgetarium] terminal did not open", error);
		terminal.write(`\r\n${String(error)}\r\n`);
	});
	return opened;
}

function shownOf(said: unknown): Uint8Array | string | null {
	if (Array.isArray(said)) {
		return said.every(isByte) ? Uint8Array.from(said) : null;
	}

	return isExitSaid(said) ? EXITED : null;
}

function isByte(value: unknown): value is number {
	return Number.isInteger(value) && typeof value === "number" && value >= 0 && value <= 255;
}

function isExitSaid(said: unknown): boolean {
	return typeof said === "object" && said !== null && "exit" in said;
}

function themeOf(host: HTMLElement): ITheme {
	const background = cssValueOf(host, "--sumi-plate");
	const foreground = cssValueOf(host, "--sumi-text");
	return {
		...(isDark(getComputedStyle(host.parentElement ?? host).backgroundColor) ? DARK_ANSI : LIGHT_ANSI),
		background,
		foreground,
		cursor: foreground,
		cursorAccent: background,
		selectionBackground: cssValueOf(host, "--sumi-accent-soft"),
	};
}

function isDark(color: string): boolean {
	const [red = 255, green = 255, blue = 255] = (color.match(/\d+(\.\d+)?/g) ?? []).map(Number);
	return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255 < DARK_LUMINANCE_BELOW;
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
