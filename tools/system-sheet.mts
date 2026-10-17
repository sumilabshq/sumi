import fs from "node:fs";
import path from "node:path";

export const DEFAULT_SYSTEM = "default";
export const SYSTEM_LAYER = "@layer wg-system {";

const SYSTEMS_FOLDER = "design-systems";
const TOKENS_FILE = "tokens.css";
const LAID_LAYER = /^@layer wg-system \{\n[\s\S]*?\n\}\n+/;

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
