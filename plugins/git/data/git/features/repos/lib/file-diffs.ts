import type { Comparison, DiffLine, DiffRange, FileDiff, FileStatus, Hunk } from "../../../shared/schema/git.schema.js";

interface CutHunks {
	readonly hunks: Hunk[];
	readonly isCut: boolean;
}

const FILE_START = "diff --git ";
const HUNK_START = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/;
const HEADER_PATHS = /^diff --git a\/(.*) b\/(.*)$/;
const NEW_PATH = "+++ b/";
const OLD_PATH = "--- a/";
const RENAME_FROM = "rename from ";
const RENAME_TO = "rename to ";
const NEW_FILE = "new file mode";
const DELETED_FILE = "deleted file mode";
const BINARY = /^Binary files .* differ$/;
const LINE_KINDS: Readonly<Record<string, DiffLine["kind"]>> = {
	" ": "context",
	"+": "added",
	"-": "removed",
};

const LINE_COUNT = /^\s*(\d+)\s(.+)$/;

export function comparisonOf(files: FileDiff[], folder: string, range: DiffRange): Comparison {
	return {
		files,
		folder,
		range,
		added: files.reduce((sum, file) => sum + file.added, 0),
		removed: files.reduce((sum, file) => sum + file.removed, 0),
	};
}

export function untrackedDiffsOf(paths: readonly string[], lineCounts: string): FileDiff[] {
	const counted = new Map(
		lineCounts
			.split("\n")
			.map((row) => LINE_COUNT.exec(row))
			.flatMap((match) => (match === null ? [] : [[match[2] ?? "", Number(match[1])] as const])),
	);
	return paths.map((path) => ({
		path,
		from: null,
		status: "added",
		isBinary: false,
		isCut: false,
		isUntracked: true,
		added: counted.get(path) ?? 0,
		removed: 0,
		hunks: [],
	}));
}

export function fileDiffsOf(text: string, lineLimit: number): FileDiff[] {
	return chunksOf(text.split("\n")).map((lines) => fileDiffOf(lines, lineLimit));
}

function chunksOf(lines: readonly string[]): string[][] {
	const chunks: string[][] = [];

	for (const line of lines) {
		if (line.startsWith(FILE_START)) {
			chunks.push([line]);
			continue;
		}

		chunks.at(-1)?.push(line);
	}

	return chunks;
}

function fileDiffOf(lines: readonly string[], lineLimit: number): FileDiff {
	const bodyStart = lines.findIndex((line) => HUNK_START.test(line));
	const header = bodyStart === -1 ? lines : lines.slice(0, bodyStart);
	const hunks = bodyStart === -1 ? [] : hunksOf(lines.slice(bodyStart));
	const cut = cutHunks(hunks, lineLimit);
	const changed = hunks.flatMap((hunk) => hunk.lines);
	return {
		path: pathOf(header),
		from: valueAfter(header, RENAME_FROM),
		status: statusOf(header),
		isBinary: header.some((line) => BINARY.test(line)),
		isCut: cut.isCut,
		isUntracked: false,
		added: changed.filter(({ kind }) => kind === "added").length,
		removed: changed.filter(({ kind }) => kind === "removed").length,
		hunks: cut.hunks,
	};
}

function hunksOf(lines: readonly string[]): Hunk[] {
	const hunks: Hunk[] = [];

	for (const line of lines) {
		const start = HUNK_START.exec(line);

		if (start !== null) {
			hunks.push({
				oldStart: Number(start[1]),
				newStart: Number(start[2]),
				lines: [],
			});
			continue;
		}

		const kind = LINE_KINDS[line.slice(0, 1)];
		const hunk = hunks.at(-1);

		if (kind === undefined || hunk === undefined) {
			continue;
		}

		hunk.lines.push({
			kind,
			text: line.slice(1),
		});
	}

	return hunks;
}

function cutHunks(hunks: readonly Hunk[], lineLimit: number): CutHunks {
	const kept: Hunk[] = [];
	let left = lineLimit;

	for (const hunk of hunks) {
		if (hunk.lines.length > left) {
			kept.push({
				...hunk,
				lines: hunk.lines.slice(0, left),
			});
			return {
				hunks: kept,
				isCut: true,
			};
		}

		kept.push(hunk);
		left -= hunk.lines.length;
	}

	return {
		hunks: kept,
		isCut: false,
	};
}

function pathOf(header: readonly string[]): string {
	return (
		valueAfter(header, NEW_PATH) ??
		valueAfter(header, RENAME_TO) ??
		valueAfter(header, OLD_PATH) ??
		HEADER_PATHS.exec(header[0] ?? "")?.[2] ??
		""
	);
}

function statusOf(header: readonly string[]): FileStatus {
	if (header.some((line) => line.startsWith(NEW_FILE))) {
		return "added";
	}

	if (header.some((line) => line.startsWith(DELETED_FILE))) {
		return "deleted";
	}

	return valueAfter(header, RENAME_FROM) === null ? "modified" : "renamed";
}

function valueAfter(lines: readonly string[], prefix: string): string | null {
	return lines.find((line) => line.startsWith(prefix))?.slice(prefix.length) ?? null;
}
