import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { tmpdir } from "node:os";
import path from "node:path";

type IconElement = readonly [tag: string, attributes: Readonly<Record<string, unknown>>];

const PACKAGE = "lucide-static@1.47.0";
const HUGEICONS_PACKAGE = "@hugeicons/core-free-icons@4.4.0";
const HUGEICONS_DIR = "core-free-icons";
const HUGEICONS_DEFAULT_STROKE = "1.5";
const DROPPED_WHEN_DEFAULT: Readonly<Record<string, string>> = {
	stroke: "currentColor",
	strokeLinecap: "round",
	strokeLinejoin: "round",
	strokeWidth: HUGEICONS_DEFAULT_STROKE,
};
const KIT_ONLY_DRAWINGS: Readonly<Record<string, string>> = { tick: "Tick02" };
const HUGEICONS_OVERRIDES: Readonly<Record<string, string>> = {
	"circle-alert": "AlertCircle",
	"maximize-2": "Maximize02",
	"minimize-2": "Minimize02",
	"mouse-pointer-2": "Cursor01",
	"music-4": "MusicNote01",
	"face-slightly-smiling": "Smile",
	"settings-2": "Settings02",
	"undo-2": "Undo02",
};
const VIEW_BOX = "0 0 24 24";

const TABLE_FILE = path.join(process.cwd(), "packages", "shared", "kit", "src", "icons", "icon-table.ts");
const NOTICE_DIR = path.join(process.cwd(), "packages", "shared", "kit", "assets", "icons");

const NOTICE = `The icon drawings in packages/shared/kit/src/icons/icon-table.ts are Lucide
(https://github.com/lucide-icons/lucide), licensed under the ISC License, a copy
of which sits beside this file.

The whole set is taken, at the version named in tools/fetch-icons.mts. What each
icon is named, and the words it also answers to, come from the same package.

Regenerate with: node tools/fetch-icons.mts

Each body is the inside of an SVG drawn on viewBox="${VIEW_BOX}", stroked with
currentColor and carrying no fill of its own.
`;

const HUGEICONS_NOTICE = `The icon drawings in packages/shared/kit/src/icons/icon-table.ts are Hugeicons
stroke-rounded (https://hugeicons.com), free set, taken from ${HUGEICONS_PACKAGE} and
licensed under the MIT License, a copy of which sits beside this file.

A Lucide name takes the Hugeicons drawing of the same name (a trailing 01 allowed) or the
one named in HUGEICONS_OVERRIDES in tools/fetch-icons.mts. Names with no drawing stay
Lucide (ISC, see ../LICENSE) and are listed in lucide-fallback.txt.

Each body is drawn on viewBox="0 0 24 24"; stroke, caps and width come from the icon's
own stylesheet, so only attributes that differ from the Hugeicons default are kept.
`;

const installDir = mkdtempSync(path.join(tmpdir(), "wg-icons-"));
writeFileSync(path.join(installDir, "package.json"), JSON.stringify({ name: "wg-icons", private: true }));
execFileSync("npm", ["install", "--no-audit", "--no-fund", "--silent", PACKAGE, HUGEICONS_PACKAGE], {
	cwd: installDir,
	stdio: "inherit",
});

const packageDir = path.join(installDir, "node_modules", "lucide-static");
const read = (name: string): string => readFileSync(path.join(packageDir, name), "utf8");
const nodes = recordOf(JSON.parse(read("icon-nodes.json")), "icon-nodes.json");
const tags = recordOf(JSON.parse(read("tags.json")), "tags.json");

const hugeicons = recordOf(
	await import(pathToFileURL(path.join(installDir, "node_modules", "@hugeicons", HUGEICONS_DIR, "dist", "esm", "index.js")).href),
	"hugeicons index",
);
const table: Record<string, string> = {};
const spoken: Record<string, string> = {};
const keptLucide: string[] = [];
for (const [name, drawn] of Object.entries(KIT_ONLY_DRAWINGS)) {
	table[name] = bodyOf(hugeiconsElementsOf(`${drawn}Icon`) ?? []);
}
for (const name of Object.keys(nodes).sort()) {
	const drawn = hugeiconsDrawingOf(name);
	if (drawn === null) keptLucide.push(name);
	table[name] = drawn ?? bodyOf(elementsOf(nodes[name], name));
	const said = wordsOf(tags[name]).join(" ");
	if (said) spoken[name] = said;
}

writeFileSync(
	TABLE_FILE,
	`export const ICON_VIEW_BOX = ${JSON.stringify(VIEW_BOX)};\n\nexport const ICON_TABLE = {\n${lines(table)}\n};\n\nexport const ICON_WORDS = {\n${lines(spoken)}\n};\n`,
);

mkdirSync(path.join(NOTICE_DIR, "hugeicons"), { recursive: true });
writeFileSync(path.join(NOTICE_DIR, "NOTICE"), NOTICE);
writeFileSync(path.join(NOTICE_DIR, "LICENSE"), read("LICENSE"));

writeFileSync(path.join(NOTICE_DIR, "hugeicons", "LICENSE"), readFileSync(path.join(installDir, "node_modules", "@hugeicons", HUGEICONS_DIR, "LICENSE.md"), "utf8"));
writeFileSync(path.join(NOTICE_DIR, "hugeicons", "NOTICE"), HUGEICONS_NOTICE);
writeFileSync(path.join(NOTICE_DIR, "hugeicons", "lucide-fallback.txt"), `${keptLucide.join("\n")}\n`);

console.log(`${Object.keys(table).length} icons -> packages/shared/kit/src/icons/icon-table.ts, ${keptLucide.length} still Lucide`);

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function recordOf(value: unknown, file: string): Readonly<Record<string, unknown>> {
	if (!isRecord(value)) throw new Error(`${PACKAGE} ${file} is not an object`);
	return value;
}

function elementsOf(value: unknown, name: string): IconElement[] {
	if (!Array.isArray(value)) throw new Error(`${name} holds no element list`);
	return value.map((element: unknown): IconElement => {
		if (!Array.isArray(element)) throw new Error(`${name} holds an element that is not a pair`);
		const [tag, held]: unknown[] = element;
		if (typeof tag !== "string" || !isRecord(held)) throw new Error(`${name} holds an element without a tag`);
		return [tag, held];
	});
}

function wordsOf(value: unknown): string[] {
	if (!Array.isArray(value)) return [];
	return value.map((word: unknown) => String(word));
}

function attributes(held: Readonly<Record<string, unknown>>): string {
	return Object.entries(held)
		.map(([name, value]) => ` ${name}="${String(value)}"`)
		.join("");
}

function bodyOf(elements: readonly IconElement[]): string {
	return elements.map(([tag, held]) => `<${tag}${attributes(held)}/>`).join("");
}

function lines(held: Readonly<Record<string, string>>): string {
	return Object.entries(held)
		.map(([name, value]) => `\t${JSON.stringify(name)}: ${JSON.stringify(value)},`)
		.join("\n");
}

function pascalOf(name: string): string {
	return name
		.split("-")
		.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
		.join("");
}

function hugeiconsDrawingOf(name: string): string | null {
	const candidates = HUGEICONS_OVERRIDES[name] ? [HUGEICONS_OVERRIDES[name]] : [pascalOf(name), `${pascalOf(name)}01`];
	for (const candidate of candidates) {
		const elements = hugeiconsElementsOf(`${candidate}Icon`);
		if (elements !== null) return bodyOf(elements);
	}
	return null;
}

function hugeiconsElementsOf(exportName: string): IconElement[] | null {
	const held = hugeicons[exportName];
	if (held === undefined) return null;
	return elementsOf(held, exportName).map(([tag, attributes]): IconElement => [tag, keptAttributes(attributes)]);
}

function keptAttributes(held: Readonly<Record<string, unknown>>): Record<string, unknown> {
	const kept: Record<string, unknown> = {};
	for (const [name, value] of Object.entries(held)) {
		if (name === "key" || DROPPED_WHEN_DEFAULT[name] === value) continue;
		kept[kebabOf(name)] = value;
	}
	return kept;
}

function kebabOf(name: string): string {
	return name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
