import { useEffect } from "react";
import type { RefObject } from "react";
import type { Terminal } from "@xterm/xterm";
import { themeOf } from "./terminal-theme.js";

export function useThemesScreen(
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
