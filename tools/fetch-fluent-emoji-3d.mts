import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";

const REPOSITORY = "https://github.com/microsoft/fluentui-emoji";
const COMMIT = "1ffb34c752ecf5d402f04cfb4b392c77f57c54bc";
const EMOJIBASE = "emojibase-data@16.0.3";
const CELL_PX = 64;
const SHEET_SIDE = 10;
const CELLS_PER_SHEET = SHEET_SIDE * SHEET_SIDE;
const WEBP_QUALITY = "82";
const ALPHA_QUALITY = "90";
const UNORDERED = Number.MAX_SAFE_INTEGER;
const VARIATION_SELECTOR = /-FE0F/g;
const SPARSE_PATHS = ["/LICENSE", "/assets/*/metadata.json", "/assets/*/3D/*.png", "/assets/*/Default/3D/*.png"];

const KIT_DIR = path.join(process.cwd(), "packages", "shared", "kit");
const TABLE_FILE = path.join(KIT_DIR, "src", "emojis", "fluent-3d-table.ts");
const SHEET_DIR = path.join(KIT_DIR, "assets", "emojis", "fluent-3d");
const SHEET_URL_FROM_TABLE = "../../assets/emojis/fluent-3d";

const NOTICE = `The emoji pictures in this folder are Microsoft Fluent Emoji
(${REPOSITORY}), 3D style, licensed under the MIT License, a copy of which sits
beside this file. Taken at commit ${COMMIT}.

Every emoji Fluent draws is taken, in its default skin tone, scaled to ${CELL_PX}px and laid
${SHEET_SIDE} by ${SHEET_SIDE} into WebP sheets. Names, groups and search words come from each
emoji's Fluent metadata; the order is Unicode's, read from ${EMOJIBASE}
(https://github.com/milesj/emojibase, MIT).

packages/shared/kit/src/emojis/fluent-3d-table.ts lists them in sheet order.

Regenerate with: node tools/fetch-fluent-emoji-3d.mts (needs git, cwebp and ffmpeg)
`;

interface FluentEmoji {
	readonly glyph: string;
	readonly name: string;
	readonly words: string;
	readonly group: string;
	readonly picture: string;
	readonly order: number;
}

const workDir = mkdtempSync(path.join(tmpdir(), "wg-fluent-3d-"));
const repoDir = path.join(workDir, "repo");
execFileSync("git", ["clone", "--filter=blob:none", "--sparse", "--no-checkout", REPOSITORY, repoDir], {
	stdio: "inherit",
});
execFileSync("git", ["sparse-checkout", "set", "--no-cone", ...SPARSE_PATHS], { cwd: repoDir, stdio: "inherit" });
execFileSync("git", ["checkout", COMMIT], { cwd: repoDir, stdio: "inherit" });
execFileSync("npm", ["install", "--no-audit", "--no-fund", "--silent", EMOJIBASE], { cwd: workDir, stdio: "inherit" });

const orderByHexcode = unicodeOrderOf(createRequire(path.join(workDir, "index.js"))("emojibase-data/en/data.json"));
const assetsDir = path.join(repoDir, "assets");
const emojis = readdirSync(assetsDir)
	.flatMap((folder) => fluentEmojiIn(path.join(assetsDir, folder)))
	.sort((one, other) => one.order - other.order || one.name.localeCompare(other.name));

rmSync(SHEET_DIR, { recursive: true, force: true });
mkdirSync(SHEET_DIR, { recursive: true });
const sheetCount = laySheets(emojis);
writeFileSync(TABLE_FILE, tableSourceOf(emojis, sheetCount));
writeFileSync(path.join(SHEET_DIR, "LICENSE"), readFileSync(path.join(repoDir, "LICENSE"), "utf8"));
writeFileSync(path.join(SHEET_DIR, "NOTICE"), NOTICE);
console.log(`${emojis.length} Fluent 3D emojis in ${sheetCount} sheets -> ${path.relative(process.cwd(), SHEET_DIR)}`);

function fluentEmojiIn(folder: string): FluentEmoji[] {
	const picture = pictureIn(folder);
	const metadata: unknown = JSON.parse(readFileSync(path.join(folder, "metadata.json"), "utf8"));
	if (picture === null || !isRecord(metadata)) {
		return [];
	}

	const glyph = stringOf(metadata["glyph"]);
	const name = stringOf(metadata["cldr"]);
	const keywords = Array.isArray(metadata["keywords"]) ? metadata["keywords"].map(String) : [];
	return [
		{
			glyph,
			name,
			words: [...new Set([name, ...keywords])].join(" ").toLowerCase(),
			group: stringOf(metadata["group"]),
			picture,
			order: orderByHexcode.get(hexcodeOf(stringOf(metadata["unicode"]))) ?? UNORDERED,
		},
	];
}

function pictureIn(folder: string): string | null {
	for (const pictureDir of [path.join(folder, "3D"), path.join(folder, "Default", "3D")]) {
		const png = existsSync(pictureDir) ? readdirSync(pictureDir).find((file) => file.endsWith(".png")) : undefined;
		if (png !== undefined) {
			return path.join(pictureDir, png);
		}
	}

	return null;
}

function laySheets(laid: readonly FluentEmoji[]): number {
	const cellsDir = path.join(workDir, "cells");
	mkdirSync(cellsDir);
	laid.forEach((emoji, index) => {
		const cell = path.join(cellsDir, `${String(index).padStart(4, "0")}.webp`);
		execFileSync("cwebp", [
			"-quiet",
			"-lossless",
			"-resize",
			String(CELL_PX),
			String(CELL_PX),
			emoji.picture,
			"-o",
			cell,
		]);
	});
	const sheetPngs = path.join(workDir, "sheet-%02d.png");
	execFileSync("ffmpeg", [
		"-loglevel",
		"error",
		"-start_number",
		"0",
		"-i",
		path.join(cellsDir, "%04d.webp"),
		"-vf",
		`tile=${SHEET_SIDE}x${SHEET_SIDE}:color=0x00000000`,
		"-pix_fmt",
		"rgba",
		"-start_number",
		"0",
		sheetPngs,
	]);
	const sheetCount = Math.ceil(laid.length / CELLS_PER_SHEET);
	for (let sheet = 0; sheet < sheetCount; sheet += 1) {
		const name = sheetNameOf(sheet);
		const png = path.join(workDir, `${name}.png`);
		execFileSync("cwebp", [
			"-quiet",
			"-q",
			WEBP_QUALITY,
			"-alpha_q",
			ALPHA_QUALITY,
			"-m",
			"6",
			png,
			"-o",
			path.join(SHEET_DIR, `${name}.webp`),
		]);
	}

	return sheetCount;
}

function tableSourceOf(laid: readonly FluentEmoji[], sheetCount: number): string {
	const rows = laid.map(
		({ glyph, name, words, group }) =>
			`\t{ glyph: ${JSON.stringify(glyph)}, name: ${JSON.stringify(name)}, words: ${JSON.stringify(words)}, group: ${JSON.stringify(group)} },`,
	);
	const sheets = Array.from(
		{ length: sheetCount },
		(_, sheet) =>
			`\t() => new URL(${JSON.stringify(`${SHEET_URL_FROM_TABLE}/${sheetNameOf(sheet)}.webp`)}, import.meta.url).href,`,
	);
	return `export interface Fluent3dEmoji {
	readonly glyph: string;
	readonly name: string;
	readonly words: string;
	readonly group: string;
}

export const FLUENT_3D_CELL_PX = ${CELL_PX};

export const FLUENT_3D_SHEET_SIDE = ${SHEET_SIDE};

export const FLUENT_3D_SHEET_URLS: readonly (() => string)[] = [
${sheets.join("\n")}
];

export const FLUENT_3D_EMOJIS: readonly Fluent3dEmoji[] = [
${rows.join("\n")}
];
`;
}

function sheetNameOf(sheet: number): string {
	return `sheet-${String(sheet).padStart(2, "0")}`;
}

function unicodeOrderOf(data: unknown): ReadonlyMap<string, number> {
	const orders = new Map<string, number>();
	if (!Array.isArray(data)) {
		return orders;
	}

	for (const entry of data) {
		if (isRecord(entry) && typeof entry["hexcode"] === "string" && typeof entry["order"] === "number") {
			orders.set(entry["hexcode"].replace(VARIATION_SELECTOR, ""), entry["order"]);
		}
	}

	return orders;
}

function hexcodeOf(unicode: string): string {
	return unicode.trim().toUpperCase().replaceAll(" ", "-").replace(VARIATION_SELECTOR, "");
}

function stringOf(value: unknown): string {
	if (typeof value !== "string" || value === "") {
		throw new Error(`Fluent metadata holds an empty field: ${String(value)}`);
	}

	return value;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
