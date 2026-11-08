import fs from "node:fs";
import path from "node:path";
import { CliRefusal } from "./cli-output.js";
import type { ScriptChanges, SourceChange } from "./rename-edits.js";
import type { ListEntryRename } from "./rename-plan.js";
import type { FileWrite } from "./rename-writes.js";

export interface FileRewrite extends FileWrite {
	readonly text: string;
	readonly scanned: string;
	readonly uses: number;
}

const MODULES_LIST = /("modules"\s*:\s*\[)([^\]]*)(\])/;

export function scriptRewriteOf({ file, text, changes }: ScriptChanges, root: string): FileRewrite {
	const rewritten = [...changes]
		.sort((one, other) => other.start - one.start)
		.reduce((was, change, at, sorted) => {
			refuseOverlap(change, sorted[at - 1], path.relative(root, file));
			return was.slice(0, change.start) + change.text + was.slice(change.end);
		}, text);
	return {
		file,
		text: rewritten,
		scanned: text,
		uses: changes.length,
	};
}

export function listRewriteOf({ file, from, to }: ListEntryRename): FileRewrite {
	const scanned = fs.readFileSync(file, "utf8");
	return {
		file,
		text: contractListRenamed(scanned, { from, to }),
		scanned,
		uses: 1,
	};
}

export function contractListRenamed(text: string, { from, to }: Omit<ListEntryRename, "file">): string {
	return text.replace(
		MODULES_LIST,
		(_list, open: string, entries: string, close: string) =>
			`${open}${entries.replaceAll(JSON.stringify(from), JSON.stringify(to))}${close}`,
	);
}

export function modulesListLineOf(file: string): number {
	const text = fs.readFileSync(file, "utf8");
	const at = text.search(MODULES_LIST);
	return text.slice(0, Math.max(at, 0)).split("\n").length;
}

function refuseOverlap(change: SourceChange, later: SourceChange | undefined, file: string): void {
	if (later !== undefined && change.end > later.start) {
		throw new CliRefusal(`${file}:${change.line}: two changes overlap; rename found the same use twice`);
	}
}
