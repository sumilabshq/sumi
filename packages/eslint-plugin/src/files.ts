import fs from "node:fs";
import path from "node:path";
import { parse } from "@babel/parser";
import type { ParserPlugin } from "@babel/parser";
import type { Statement } from "@babel/types";

export interface FoundEntry {
	readonly full: string;
	readonly isFolder: boolean;
}

export interface ParsedSource {
	readonly text: string;
	readonly body: Statement[];
}

const SKIPPED_FOLDERS: ReadonlySet<string> = new Set(["node_modules", "dist", "generated"]);

export function entriesUnder(root: string): FoundEntry[] {
	if (!fs.existsSync(root)) {
		return [];
	}

	return fs
		.readdirSync(root, { withFileTypes: true })
		.filter((entry) => !entry.name.startsWith(".") && !SKIPPED_FOLDERS.has(entry.name))
		.flatMap((entry) => {
			const full = path.join(root, entry.name);
			const found = { full, isFolder: entry.isDirectory() };
			return found.isFolder ? [found, ...entriesUnder(full)] : [found];
		});
}

export function parsedSourceOf(file: string): ParsedSource {
	const text = fs.readFileSync(file, "utf8");
	const plugins: ParserPlugin[] = file.endsWith(".tsx") ? ["typescript", "jsx"] : ["typescript"];
	return {
		text,
		body: parse(text, { sourceType: "module", plugins }).program.body,
	};
}

export function babelBodyOf(file: string): Statement[] {
	return parsedSourceOf(file).body;
}
