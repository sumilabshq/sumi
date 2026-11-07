import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal } from "@xterm/xterm";
import { TERMINAL_SHEET } from "./terminal-sheet.js";
import { cssValueOf } from "./terminal-theme.js";

const SHEET_ID = "wg-terminal-sheet";
const FONT_SIZE = 13;
const LINE_HEIGHT = 1.25;
const SCROLLBACK = 10_000;

export function useScreenIn(screen: RefObject<HTMLDivElement | null>): RefObject<Terminal | null> {
	const terminal = useRef<Terminal | null>(null);
	useEffect(() => {
		const host = screen.current;

		if (host === null) {
			return;
		}

		layTerminalSheet(host.ownerDocument);
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

function layTerminalSheet(document: Document): void {
	if (document.getElementById(SHEET_ID) !== null) {
		return;
	}

	const sheet = document.createElement("style");
	sheet.id = SHEET_ID;
	sheet.textContent = TERMINAL_SHEET;
	document.head.append(sheet);
}
