import fs from "node:fs";
import * as fileSystem from "node:fs/promises";
import path from "node:path";
import { checkDesignSystem } from "../packages/shared/core/src/design-system/design-system-check.js";
import { contrastAt } from "../packages/shared/core/src/design-system/token-findings.js";
import { parseTokenSheet } from "../packages/shared/core/src/design-system/token-sheet.js";
import { EMPTY_LISTING, nodeProjectFiles, type ProjectFiles } from "../packages/shared/core/src/project/index.js";

const SYSTEMS = "design-systems";
const SAMPLE = "default";
const TOKENS = "tokens.css";
const DESIGN = "DESIGN.md";
const MANIFEST = "manifest.json";

let failed = 0;

function check(name: string, isPassing: boolean, said: string): void {
	if (!isPassing) {
		failed += 1;
	}

	console.log(`${isPassing ? "OK  " : "!!  "}${name}${isPassing ? "" : `  ${said}`}`);
}

function memoryFiles(files: ReadonlyMap<string, string>): ProjectFiles {
	return {
		list: async () => EMPTY_LISTING,
		read: async (at) => files.get(at) ?? null,
		exists: async (at) => files.has(at) || [...files.keys()].some((held) => held.startsWith(`${at}/`)),
	};
}

function sampleFiles(): Map<string, string> {
	const folder = path.join(SYSTEMS, SAMPLE);
	const named = [MANIFEST, DESIGN, TOKENS, "USAGE.md", "preview/colors.html"];
	return new Map(named.map((at) => [at, fs.readFileSync(path.join(folder, at), "utf8")]));
}

function withEdit(file: string, edit: (text: string) => string): Map<string, string> {
	const files = sampleFiles();
	const text = files.get(file) ?? "";
	const edited = edit(text);
	if (edited === text) {
		throw new Error(`the mutation of ${file} changed nothing`);
	}

	files.set(file, edited);
	return files;
}

function replacedOnce(text: string, old: string, now: string): string {
	if (text.split(old).length !== 2) {
		throw new Error(`expected exactly one ${old}`);
	}

	return text.replace(old, now);
}

async function findingsOf(files: ReadonlyMap<string, string>): Promise<string[]> {
	return checkDesignSystem(memoryFiles(files), SAMPLE);
}

async function expectFinding(name: string, files: ReadonlyMap<string, string>, wanted: RegExp): Promise<void> {
	const found = await findingsOf(files);
	check(
		name,
		found.some((finding) => wanted.test(finding)),
		`found ${JSON.stringify(found)}`,
	);
}

for (const slug of fs.readdirSync(SYSTEMS).filter((entry) => fs.statSync(path.join(SYSTEMS, entry)).isDirectory())) {
	const found = await checkDesignSystem(nodeProjectFiles(path.join(SYSTEMS, slug), fileSystem), slug);
	check(`${slug} passes the guard`, found.length === 0, found.join("\n      "));
}

check(
	"the sample passes in memory too, so every mutation below starts green",
	(await findingsOf(sampleFiles())).length === 0,
	"",
);

await expectFinding(
	"a manifest naming a missing file is refused",
	withEdit(MANIFEST, (text) => replacedOnce(text, '"USAGE.md"', '"GONE.md"')),
	/GONE\.md is named in the manifest and missing/,
);
await expectFinding(
	"a manifest whose id is not its folder is refused",
	withEdit(MANIFEST, (text) => replacedOnce(text, '"id": "default"', '"id": "other"')),
	/does not match its folder/,
);
await expectFinding(
	"a DESIGN.md under seven H2 sections is refused",
	withEdit(DESIGN, (text) => text.replace(/^## /gm, "### ")),
	/H2 sections/,
);
await expectFinding(
	"an A1 token missing from the dark block is refused",
	withEdit(TOKENS, (text) => text.replace(/(\.theme-dark \{[\s\S]*?)\t--ring: var\(--brand\);\n/, "$1")),
	/--ring is required in \.dark/,
);
await expectFinding(
	"an expected token that resolves in neither theme is refused",
	withEdit(TOKENS, (text) => text.replace(/\t--chart-3: var\(--cyan\);\n/g, "")),
	/--chart-3 in the light theme/,
);
await expectFinding(
	"a token outside the contract is refused",
	withEdit(TOKENS, (text) => replacedOnce(text, "\t--hue: 293;", "\t--hue: 293;\n\t--sparkle: var(--brand);")),
	/--sparkle is neither a contract token/,
);
await expectFinding(
	"a fixed colour is refused",
	withEdit(TOKENS, (text) =>
		text.replace("--brand: oklch(var(--l-brand) var(--chroma) var(--hue));", "--brand: #9873f7;"),
	),
	/--brand: #9873f7 is a fixed colour/,
);
await expectFinding(
	"a colour that reads no parameter is refused",
	withEdit(TOKENS, (text) =>
		text.replace(
			"--foreground: oklch(var(--l-ink) var(--neutral-chroma) var(--hue));",
			"--foreground: oklch(0.252 0 0);",
		),
	),
	/--foreground in the light theme depends on no parameter/,
);
await expectFinding(
	"a dark block that does not select Obsidian's dark theme is refused",
	withEdit(TOKENS, (text) => replacedOnce(text, ".dark,\n.theme-dark {", ".dark {")),
	/must also select \.theme-dark/,
);
await expectFinding(
	"a foreground below 4.5:1 at the shipped parameters is refused",
	withEdit(TOKENS, (text) => replacedOnce(text, "\t--l-ink: 0.252;", "\t--l-ink: 0.7;")),
	/--foreground on --background is .*light theme at the shipped parameters/,
);

const brandInkOnly = withEdit(TOKENS, (text) =>
	text.replaceAll(
		"--brand-foreground: oklch(var(--l-on-brand) var(--neutral-chroma) var(--hue));",
		"--brand-foreground: oklch(1 0 var(--hue));",
	),
);
const sheet = parseTokenSheet(brandInkOnly.get(TOKENS) ?? "");
const shipped = contrastAt(sheet, ["brand", "brand-foreground"], { theme: "light", hue: undefined }) ?? 0;
check(
	"white on the brand is the 3.5:1 the kit draws today, measured",
	shipped > 3 && shipped < 4.5,
	`measured ${shipped.toFixed(2)}`,
);
await expectFinding("white on the brand is refused", brandInkOnly, /--brand-foreground on --brand/);

const hueSensitive = withEdit(TOKENS, (text) =>
	replacedOnce(
		replacedOnce(
			replacedOnce(replacedOnce(text, "\t--hue: 293;", "\t--hue: 110;"), "\t--chroma: 0.1896;", "\t--chroma: 0.25;"),
			"\t--l-brand: 0.6535;",
			"\t--l-brand: 0.62;",
		),
		"\t--l-on-brand: 0.15;",
		"\t--l-on-brand: 0.25;",
	),
);
const lightBrandFindings = (await findingsOf(hueSensitive)).filter(
	(finding) => finding.includes("--brand-foreground on --brand") && finding.includes("light theme"),
);
check(
	"a pair passing at the shipped hue and failing at a swept one is refused by the sweep",
	lightBrandFindings.length > 0 && lightBrandFindings.every((finding) => finding.includes("at --hue")),
	`found ${JSON.stringify(lightBrandFindings)}`,
);

console.log(failed === 0 ? "\ndesign system guard: all passed" : `\ndesign system guard: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
