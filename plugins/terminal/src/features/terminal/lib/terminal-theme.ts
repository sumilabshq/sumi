import type { ITheme } from "@xterm/xterm";

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

export function themeOf(host: HTMLElement, isDark: boolean): ITheme {
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

export function cssValueOf(host: HTMLElement, name: string): string {
	return getComputedStyle(host).getPropertyValue(name).trim();
}
