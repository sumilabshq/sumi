import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const PACKAGE = "@phosphor-icons/core@2.1.1";
const PACKAGE_DIR = path.join("node_modules", "@phosphor-icons", "core");
const VIEW_BOX = "0 0 256 256";
const SVG_BODY = /^<svg[^>]*>([\s\S]*)<\/svg>\s*$/;
const TABLE_FILE = path.join(process.cwd(), "packages", "shared", "kit", "src", "icons", "filled-icon-table.ts");
const NOTICE_DIR = path.join(process.cwd(), "packages", "shared", "kit", "assets", "icons", "phosphor");

const NOTICE = `The icon drawings in packages/shared/kit/src/icons/filled-icon-table.ts are Phosphor
Icons (https://phosphoricons.com), Fill weight, taken whole from ${PACKAGE} and
licensed under the MIT License, a copy of which sits beside this file.

Each icon keeps its Phosphor name; the words it answers to are its Phosphor tags
and categories.

Regenerate with: node tools/fetch-filled-icons.mts

Each body is the inside of an SVG drawn on viewBox="${VIEW_BOX}" and filled with
currentColor.
`;

interface PhosphorIcon {
	readonly name: string;
	readonly words: string;
}

const installDir = mkdtempSync(path.join(tmpdir(), "wg-filled-icons-"));
writeFileSync(path.join(installDir, "package.json"), JSON.stringify({ name: "wg-filled-icons", private: true }));
execFileSync("npm", ["install", "--no-audit", "--no-fund", "--silent", PACKAGE], {
	cwd: installDir,
	stdio: "inherit",
});

const packageDir = path.join(installDir, PACKAGE_DIR);
const listed: unknown = (await import(pathToFileURL(path.join(packageDir, "dist", "index.mjs")).href)).icons;
const icons = phosphorIconsOf(listed).sort((one, other) => one.name.localeCompare(other.name));
const bodies: Record<string, string> = {};
const words: Record<string, string> = {};

for (const icon of icons) {
	bodies[icon.name] = bodyOf(readFileSync(path.join(packageDir, "assets", "fill", `${icon.name}-fill.svg`), "utf8"));
	words[icon.name] = icon.words;
}

writeFileSync(
	TABLE_FILE,
	`export const FILLED_ICON_VIEW_BOX = ${JSON.stringify(VIEW_BOX)};\n\nexport const FILLED_ICON_TABLE: Readonly<Record<string, string>> = {\n${linesOf(bodies)}\n};\n\nexport const FILLED_ICON_WORDS: Readonly<Record<string, string>> = {\n${linesOf(words)}\n};\n`,
);
mkdirSync(NOTICE_DIR, { recursive: true });
writeFileSync(path.join(NOTICE_DIR, "NOTICE"), NOTICE);
writeFileSync(path.join(NOTICE_DIR, "LICENSE"), readFileSync(path.join(packageDir, "LICENSE"), "utf8"));
console.log(`${icons.length} filled icons -> ${path.relative(process.cwd(), TABLE_FILE)}`);

function phosphorIconsOf(value: unknown): PhosphorIcon[] {
	if (!Array.isArray(value)) {
		throw new Error(`${PACKAGE} exports no icon list`);
	}

	return value.map(phosphorIconOf);
}

function phosphorIconOf(value: unknown): PhosphorIcon {
	if (typeof value !== "object" || value === null || !("name" in value) || typeof value.name !== "string") {
		throw new Error(`${PACKAGE} lists an icon without a name`);
	}

	const tags = "tags" in value ? stringsOf(value.tags) : [];
	const categories = "categories" in value ? stringsOf(value.categories) : [];
	return {
		name: value.name,
		words: [value.name.replaceAll("-", " "), ...tags, ...categories].filter((word) => !word.startsWith("*")).join(" "),
	};
}

function stringsOf(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((word): word is string => typeof word === "string") : [];
}

function bodyOf(svg: string): string {
	const body = SVG_BODY.exec(svg.trim())?.[1];
	if (body === undefined) {
		throw new Error(`not an SVG: ${svg.slice(0, 80)}`);
	}

	return body;
}

function linesOf(held: Readonly<Record<string, string>>): string {
	return Object.entries(held)
		.map(([name, value]) => `\t${JSON.stringify(name)}: ${JSON.stringify(value)},`)
		.join("\n");
}
