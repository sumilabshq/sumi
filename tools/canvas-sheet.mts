import fs from "node:fs";
import path from "node:path";
import { compile } from "tailwindcss";

export const TAILWIND_BANNER = "/*! tailwindcss";

const SOURCES = ["packages/canvas", "packages/mascot", "packages/app-host", "apps/studio/src/canvas"];
const SCANNED = /\.(ts|tsx)$/;
const CANDIDATE = /[^\s"'`]+/g;
const NAMED_SHEETS: Readonly<Record<string, string>> = {
	"tailwindcss/theme.css": "node_modules/tailwindcss/theme.css",
	"tailwindcss/utilities.css": "node_modules/tailwindcss/utilities.css",
	"@widgetarium/kit/theme.css": "packages/kit/theme.css",
	"@widgetarium/canvas/canvas.css": "packages/canvas/canvas.css",
	"@widgetarium/mascot/mascot.css": "packages/mascot/mascot.css",
};
// TRADE-OFF: a prefix on every class, because utilities are !important and Obsidian, its themes and other plugins share one page
const ENTRY = `@layer theme, base, components, utilities;
@import "tailwindcss/theme.css" layer(theme) prefix(cv);
@import "tailwindcss/utilities.css" layer(utilities) important;
@import "@widgetarium/kit/theme.css";
@import "@widgetarium/canvas/canvas.css";
@import "@widgetarium/mascot/mascot.css";
`;

export async function canvasSheet(repo: string): Promise<string> {
	const compiler = await compile(ENTRY, {
		base: repo,
		loadStylesheet: async (id: string, base: string) => {
			const named = NAMED_SHEETS[id];
			if (!named) throw new Error(`the canvas sheet imports ${id}, which it does not know`);
			const at = path.join(repo, named);
			return { path: at, base, content: fs.readFileSync(at, "utf8") };
		},
	});
	return compiler.build(candidatesUnder(repo));
}

export function withCanvasSheet(authored: string, sheet: string): string {
	const [kept = ""] = authored.split(TAILWIND_BANNER);
	return `${kept.trimEnd()}\n\n${sheet.trimEnd()}\n`;
}

function candidatesUnder(repo: string): string[] {
	const files = SOURCES.flatMap((source) => filesUnder(path.join(repo, source)));
	return [...new Set(files.flatMap((file) => fs.readFileSync(file, "utf8").match(CANDIDATE) ?? []))];
}

function filesUnder(folder: string): string[] {
	return fs.readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
		const at = path.join(folder, entry.name);
		if (entry.isDirectory()) return entry.name === "node_modules" ? [] : filesUnder(at);
		return SCANNED.test(entry.name) ? [at] : [];
	});
}
