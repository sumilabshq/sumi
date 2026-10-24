import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { format, resolveConfig } from "prettier";

const REPO = path.resolve(import.meta.dirname, "..");
const BOARD = path.join(REPO, "docs/reference/sumi-layout/Ws-pick-icons.dc.html");
const TABLE = path.join(REPO, "packages/domain/workspaces/shared/lib/filled-icons.ts");
const PICKED_ICON = /<button aria-label="([a-z0-9-]+)"[^>]*><svg class="i lf"[^>]*><mask [^>]*>(.*?)<\/mask>/g;
const MASK_GROUND = /^<rect x="0" y="0" width="24" height="24" fill="#000000"><\/rect>/;

const board = readFileSync(BOARD, "utf8");
const rows = new Map<string, string>();
for (const [, name = "", body = ""] of board.matchAll(PICKED_ICON)) {
	rows.set(name, body.replace(MASK_GROUND, ""));
}

if (rows.size === 0) {
	throw new Error(`${BOARD} holds no filled icon`);
}

const lines = [...rows].map(([name, body]) => `\t${JSON.stringify(name)}: ${JSON.stringify(body)},`);
const table = `export const FILLED_ICONS: Readonly<Record<string, string>> = {\n${lines.join("\n")}\n};\n`;
writeFileSync(TABLE, await format(table, { ...(await resolveConfig(TABLE)), filepath: TABLE }));
console.log(`${rows.size} filled icons → ${path.relative(REPO, TABLE)}`);
