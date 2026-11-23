import fs from "node:fs";
import path from "node:path";
import { splitAtTopCommas } from "./studio-sheet.mts";

export const DEFAULT_SYSTEM = "default";
const STUDIO_SYSTEM_ID = "sumi";
const STUDIO_RUNTIME_SHEET = "sumi.css";
export const SYSTEM_LAYER = "@layer wg-system {";
const STUDIO_SYSTEM_LAYER = "@layer wg-studio-system {";

const SYSTEMS_FOLDER = "design-systems";
const TOKENS_FILE = "tokens.css";
const LAID_LAYER = /^@layer wg-system \{\n[\s\S]*?\n\}\n+/;
const LAID_STUDIO_LAYER = /^@layer wg-studio-system \{\n[\s\S]*?\n\}\n+/;
const ROOT_SELECTOR = ":root";
const STUDIO_SHELL_SCOPES: readonly string[] = [".wg-studio", ".wg-kit-portal-layer.is-studio"];
const APP_SCOPES_IN_STUDIO: readonly string[] = [
	".wg-studio-drawn",
	".wg-studio:not(.is-canvas) > .wg-studio-outlet",
	".wg-shell-route",
];
const STUDIO_TYPE_FEATURES = `${STUDIO_SHELL_SCOPES.join(",\n")} {\n\tfont-feature-settings: var(--font-features);\n}\n\n`;
const TOKEN_RULE = /([^{}]+)\{([^{}]*)\}/g;
const FONTS_FOLDER = "packages/shared/kit/assets/fonts";

interface FontFace {
	readonly family: string;
	readonly weight: string;
	readonly style: "normal" | "italic";
	readonly file: string;
	readonly unicodeRange: string | null;
}

const LATIN_UNICODE_RANGE =
	"U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";
const CYRILLIC_UNICODE_RANGE = "U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116";

const STUDIO_FONT_FACES: readonly FontFace[] = [
	{
		family: "Inter",
		weight: "100 900",
		style: "normal",
		file: "inter/InterVariable-latin.woff2",
		unicodeRange: LATIN_UNICODE_RANGE,
	},
	{
		family: "Inter",
		weight: "100 900",
		style: "normal",
		file: "inter/InterVariable-cyrillic.woff2",
		unicodeRange: CYRILLIC_UNICODE_RANGE,
	},
	{
		family: "IBM Plex Serif",
		weight: "400",
		style: "normal",
		file: "ibm-plex-serif/ibm-plex-serif-latin-400-normal.woff2",
		unicodeRange: LATIN_UNICODE_RANGE,
	},
	{
		family: "IBM Plex Serif",
		weight: "400",
		style: "italic",
		file: "ibm-plex-serif/ibm-plex-serif-latin-400-italic.woff2",
		unicodeRange: LATIN_UNICODE_RANGE,
	},
	{
		family: "IBM Plex Serif",
		weight: "500",
		style: "normal",
		file: "ibm-plex-serif/ibm-plex-serif-latin-500-normal.woff2",
		unicodeRange: LATIN_UNICODE_RANGE,
	},
	{
		family: "IBM Plex Serif",
		weight: "400",
		style: "normal",
		file: "ibm-plex-serif/ibm-plex-serif-cyrillic-400-normal.woff2",
		unicodeRange: CYRILLIC_UNICODE_RANGE,
	},
	{
		family: "IBM Plex Serif",
		weight: "400",
		style: "italic",
		file: "ibm-plex-serif/ibm-plex-serif-cyrillic-400-italic.woff2",
		unicodeRange: CYRILLIC_UNICODE_RANGE,
	},
	{
		family: "IBM Plex Serif",
		weight: "500",
		style: "normal",
		file: "ibm-plex-serif/ibm-plex-serif-cyrillic-500-normal.woff2",
		unicodeRange: CYRILLIC_UNICODE_RANGE,
	},
	{
		family: "JetBrains Mono",
		weight: "100 800",
		style: "normal",
		file: "jetbrains-mono/JetBrainsMonoVariable-latin.woff2",
		unicodeRange: null,
	},
];

export function systemTokensOf(repo: string, system: string = DEFAULT_SYSTEM): string {
	return fs.readFileSync(path.join(repo, SYSTEMS_FOLDER, system, TOKENS_FILE), "utf8");
}

export function withSystemTokens(authored: string, tokens: string): string {
	const rest = authored.replace(LAID_LAYER, "");
	return `${SYSTEM_LAYER}\n${tokens.trimEnd()}\n}\n\n${rest}`;
}

export function laidSystemTokensOf(sheet: string): string | null {
	const laid = LAID_LAYER.exec(sheet);
	return laid === null ? null : laid[0];
}

export function studioSystemLayerOf(repo: string): string {
	const studio = scopeTokens(systemTokensOf(repo, STUDIO_SYSTEM_ID), STUDIO_SHELL_SCOPES);
	const app = scopeTokens(systemTokensOf(repo), APP_SCOPES_IN_STUDIO);
	const runtime = indent(`${studioRuntimeSheetOf(repo).trimEnd()}\n\n${STUDIO_TYPE_FEATURES}`);
	return `${STUDIO_SYSTEM_LAYER}\n${fontFacesOf(repo)}${runtime}${studio}${app}}\n\n`;
}

export function withStudioSystem(authored: string, layer: string): string {
	return `${layer}${authored.replace(LAID_LAYER, "").replace(LAID_STUDIO_LAYER, "")}`;
}

function studioRuntimeSheetOf(repo: string): string {
	return fs.readFileSync(path.join(repo, SYSTEMS_FOLDER, STUDIO_SYSTEM_ID, STUDIO_RUNTIME_SHEET), "utf8");
}

function scopeTokens(tokens: string, scopes: readonly string[]): string {
	return [...tokens.matchAll(TOKEN_RULE)]
		.map(([, selectors = "", body = ""]) => `${scopedSelectorsOf(selectors, scopes).join(",\n")} {${body}}\n\n`)
		.map(indent)
		.join("");
}

function scopedSelectorsOf(selectors: string, scopes: readonly string[]): string[] {
	const trimmedSelectors = splitAtTopCommas(selectors).map((selector) => selector.trim());
	return trimmedSelectors.flatMap((selector) =>
		scopes.map((scope) => (selector === ROOT_SELECTOR ? scope : `${selector} ${scope}`)),
	);
}

// TRADE-OFF: fonts ride in the sheet as base64, because Obsidian loads styles.css as text and resolves no font URL beside it
function fontFacesOf(repo: string): string {
	return STUDIO_FONT_FACES.map(({ family, weight, style, file, unicodeRange }) => {
		const font = fs.readFileSync(path.join(repo, FONTS_FOLDER, file)).toString("base64");
		const unicodeRangeDeclaration = unicodeRange === null ? "" : `\tunicode-range: ${unicodeRange};\n`;
		return indent(
			`@font-face {\n\tfont-family: "${family}";\n\tfont-style: ${style};\n\tfont-weight: ${weight};\n\tfont-display: swap;\n\tsrc: url("data:font/woff2;base64,${font}") format("woff2");\n${unicodeRangeDeclaration}}\n\n`,
		);
	}).join("");
}

function indent(block: string): string {
	return block.replace(/^(?=.)/gm, "\t");
}
