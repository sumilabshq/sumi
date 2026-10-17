import fs from "node:fs";
import path from "node:path";
import { splitAtTopCommas } from "./studio-sheet.mts";

export const DEFAULT_SYSTEM = "default";
const STUDIO_SYSTEM_ID = "pill";
export const SYSTEM_LAYER = "@layer wg-system {";
const STUDIO_SYSTEM_LAYER = "@layer wg-studio-system {";

const SYSTEMS_FOLDER = "design-systems";
const TOKENS_FILE = "tokens.css";
const LAID_LAYER = /^@layer wg-system \{\n[\s\S]*?\n\}\n+/;
const LAID_STUDIO_LAYER = /^@layer wg-studio-system \{\n[\s\S]*?\n\}\n+/;
const ROOT_SELECTOR = ":root";
const STUDIO_SHELL_SCOPES: readonly string[] = [".wg-studio"];
const APP_SCOPES_IN_STUDIO: readonly string[] = [".wg-studio-drawn", ".wg-studio:not(.is-canvas) > .wg-studio-outlet"];
const TOKEN_RULE = /([^{}]+)\{([^{}]*)\}/g;
const GEIST_FOLDER = "packages/kit/assets/fonts/geist";
const GEIST_FACES: readonly (readonly [number, string])[] = [
	[400, "Geist-Regular.woff2"],
	[500, "Geist-Medium.woff2"],
	[600, "Geist-SemiBold.woff2"],
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
	return `${STUDIO_SYSTEM_LAYER}\n${geistFacesOf(repo)}${studio}${app}}\n\n`;
}

export function withStudioSystem(authored: string, layer: string): string {
	return `${layer}${authored.replace(LAID_LAYER, "").replace(LAID_STUDIO_LAYER, "")}`;
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

// TRADE-OFF: Geist rides in the sheet as base64, because Obsidian loads styles.css as text and resolves no font URL beside it
function geistFacesOf(repo: string): string {
	return GEIST_FACES.map(([weight, file]) => {
		const font = fs.readFileSync(path.join(repo, GEIST_FOLDER, file)).toString("base64");
		return indent(
			`@font-face {\n\tfont-family: "Geist";\n\tfont-style: normal;\n\tfont-weight: ${weight};\n\tfont-display: swap;\n\tsrc: url("data:font/woff2;base64,${font}") format("woff2");\n}\n\n`,
		);
	}).join("");
}

function indent(block: string): string {
	return block.replace(/^(?=.)/gm, "\t");
}
