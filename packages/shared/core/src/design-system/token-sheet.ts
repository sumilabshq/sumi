export type ThemeName = "light" | "dark";

export interface TokenRule {
	readonly selectors: readonly string[];
	readonly declarations: ReadonlyMap<string, string>;
}

export interface TokenSheet {
	readonly rules: readonly TokenRule[];
}

export const LIGHT_SELECTOR = ":root";
export const DARK_SELECTOR = ".dark";
export const HOST_DARK_SELECTOR = ".theme-dark";

const COMMENT = /\/\*[\s\S]*?\*\//g;
const RULE = /([^{}]+)\{([^{}]*)\}/g;
const CUSTOM_PROPERTY = /^--[a-z0-9-]+$/;

export function parseTokenSheet(text: string): TokenSheet {
	const rules = [...text.replace(COMMENT, "").matchAll(RULE)].map(([, selectorText = "", body = ""]) => ({
		selectors: selectorText.split(",").map((selector) => selector.trim()),
		declarations: declarationsIn(body),
	}));
	return { rules };
}

export function blockDeclarationsOf(sheet: TokenSheet, selector: string): ReadonlyMap<string, string> {
	return mergedDeclarations(sheet.rules.filter((rule) => rule.selectors.includes(selector)));
}

export function themeDeclarationsOf(sheet: TokenSheet, theme: ThemeName): ReadonlyMap<string, string> {
	const light = blockDeclarationsOf(sheet, LIGHT_SELECTOR);
	if (theme === "light") {
		return light;
	}

	return new Map([...light, ...blockDeclarationsOf(sheet, DARK_SELECTOR)]);
}

export function nameOf(property: string): string {
	return property.slice(2);
}

export function splitOutsideParentheses(text: string, separator: string): string[] {
	const parts: string[] = [];
	let depth = 0;
	let start = 0;
	for (let at = 0; at < text.length; at += 1) {
		const character = text[at];
		depth += depthStepOf(character);
		if (depth === 0 && character === separator) {
			parts.push(text.slice(start, at));
			start = at + 1;
		}
	}

	parts.push(text.slice(start));
	return parts;
}

function mergedDeclarations(rules: readonly TokenRule[]): ReadonlyMap<string, string> {
	return new Map(rules.flatMap((rule) => [...rule.declarations]));
}

function declarationsIn(body: string): Map<string, string> {
	const declarations = splitOutsideParentheses(body, ";")
		.map((declaration) => declaration.trim())
		.filter((declaration) => declaration !== "")
		.map((declaration): [string, string] => {
			const colon = declaration.indexOf(":");
			return [declaration.slice(0, colon).trim(), declaration.slice(colon + 1).trim()];
		});
	return new Map(declarations.filter(([property]) => CUSTOM_PROPERTY.test(property)));
}

function depthStepOf(character: string | undefined): number {
	if (character === "(") {
		return 1;
	}

	return character === ")" ? -1 : 0;
}
