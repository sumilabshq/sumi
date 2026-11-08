import type { DiffRange, FileDiff, FileStatus } from "../../../shared/schema/git.schema.js";

interface LineCounts {
	readonly added: number;
	readonly removed: number;
	readonly isBinary: boolean;
}

interface NamedChange {
	readonly path: string;
	readonly from: string | null;
	readonly status: FileStatus;
}

const NUL = "\0";
const FIELD = "\t";
const BINARY_COUNT = "-";
const PATHS_START = "--";
const OPTIONS_END = "--end-of-options";
const TWO_PATH_CODES = ["R", "C"];
const STATUS_OF_CODE: Readonly<Record<string, FileStatus>> = {
	A: "added",
	C: "added",
	D: "deleted",
	R: "renamed",
};
const NO_COUNTS: LineCounts = {
	added: 0,
	removed: 0,
	isBinary: false,
};

export function diffArgsOf(range: DiffRange, flags: readonly string[], paths: readonly string[]): string[] {
	const pathArgs = paths.length === 0 ? [] : [PATHS_START, ...paths];

	if (range.kind === "show") {
		return ["show", "--format=", "--first-parent", ...flags, OPTIONS_END, range.sha, ...pathArgs];
	}

	const revisions = range.kind === "commits" ? [range.from, range.to] : [range.from];
	return ["diff", ...flags, ...revisions, ...pathArgs];
}

export function changedFilesOf(nameStatus: string, numstat: string): FileDiff[] {
	const counts = lineCountsOf(numstat);
	return namedChangesOf(nameStatus).map(({ path, from, status }) => {
		const counted = counts.get(path) ?? NO_COUNTS;
		return {
			path,
			from,
			status,
			isBinary: counted.isBinary,
			isCut: false,
			isUntracked: false,
			added: counted.added,
			removed: counted.removed,
			hunks: [],
		};
	});
}

function namedChangesOf(nameStatus: string): NamedChange[] {
	const tokens = nameStatus.split(NUL);
	const changes: NamedChange[] = [];
	let at = 0;

	while (at < tokens.length) {
		const code = tokens[at] ?? "";
		const letter = code.slice(0, 1);

		if (letter === "") {
			at += 1;
			continue;
		}

		const hasTwoPaths = TWO_PATH_CODES.includes(letter);
		changes.push({
			path: (hasTwoPaths ? tokens[at + 2] : tokens[at + 1]) ?? "",
			from: hasTwoPaths ? (tokens[at + 1] ?? null) : null,
			status: STATUS_OF_CODE[letter] ?? "modified",
		});
		at += hasTwoPaths ? 3 : 2;
	}

	return changes;
}

function lineCountsOf(numstat: string): Map<string, LineCounts> {
	const tokens = numstat.split(NUL);
	const counts = new Map<string, LineCounts>();
	let at = 0;

	while (at < tokens.length) {
		const [added = "", removed = "", path = ""] = (tokens[at] ?? "").split(FIELD);

		if (added === "") {
			at += 1;
			continue;
		}

		const isRename = path === "";
		counts.set(isRename ? (tokens[at + 2] ?? "") : path, {
			added: added === BINARY_COUNT ? 0 : Number(added),
			removed: removed === BINARY_COUNT ? 0 : Number(removed),
			isBinary: added === BINARY_COUNT,
		});
		at += isRename ? 3 : 1;
	}

	return counts;
}
