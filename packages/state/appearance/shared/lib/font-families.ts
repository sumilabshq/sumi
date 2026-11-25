import type { FontChoice, FontRole } from "../schema/fonts.schema.js";

const SANS_FALLBACK = "-apple-system, BlinkMacSystemFont, system-ui, sans-serif";
const MONO_FALLBACK = "ui-monospace, Menlo, monospace";

const SANS_FAMILIES: readonly string[] = [
	"IBM Plex Sans",
	"system-ui",
	"Helvetica Neue",
	"Avenir Next",
	"Arial",
	"Verdana",
];
const MONO_FAMILIES: readonly string[] = ["JetBrains Mono", "SF Mono", "Menlo", "Monaco", "Courier New"];

export const FAMILIES_OF: Readonly<Record<FontRole, readonly string[]>> = {
	heading: SANS_FAMILIES,
	ui: SANS_FAMILIES,
	code: MONO_FAMILIES,
};

export const DEFAULT_FAMILY_OF: Readonly<Record<FontRole, string>> = {
	heading: "IBM Plex Sans",
	ui: "IBM Plex Sans",
	code: "JetBrains Mono",
};

export function stackOf(role: FontRole, family: string): string {
	const fallback = role === "code" ? MONO_FALLBACK : SANS_FALLBACK;

	if (family === "system-ui") {
		return fallback;
	}

	return `"${family}", ${fallback}`;
}

export function choiceOf(role: FontRole, family: string): FontChoice {
	return { family, stack: stackOf(role, family) };
}

export function isAvailable(role: FontRole, family: string): boolean {
	return FAMILIES_OF[role].includes(family);
}
