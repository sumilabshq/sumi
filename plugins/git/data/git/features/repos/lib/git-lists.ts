import type { CommitRow, StashRow } from "../../../shared/schema/git.schema.js";

export interface Worktree {
	readonly path: string;
	readonly branch: string | null;
}

export interface BranchRef {
	readonly name: string;
	readonly upstream: string | null;
	readonly at: number;
}

const FIELD = "\t";
const WORKTREE_LINE = "worktree ";
const BRANCH_LINE = "branch refs/heads/";

export const BRANCH_FORMAT = "--format=%(refname:short)%09%(upstream:short)%09%(committerdate:unix)";
export const STASH_FORMAT = "--format=%gd%x09%ct%x09%s";
export const COMMIT_FORMAT = "--format=%H%x09%h%x09%ct%x09%s";

export function branchesOf(refs: string): BranchRef[] {
	return rowsOf(refs).map(([name = "", upstream = "", at = "0"]) => ({
		name,
		upstream: upstream === "" ? null : upstream,
		at: secondsOf(at),
	}));
}

export function stashesOf(list: string): StashRow[] {
	return rowsOf(list).map(([ref = "", at = "0", ...title]) => ({
		ref,
		at: secondsOf(at),
		title: title.join(FIELD),
	}));
}

export function commitsOf(log: string): CommitRow[] {
	return rowsOf(log).map(([sha = "", short = "", at = "0", ...title]) => ({
		sha,
		short,
		at: secondsOf(at),
		title: title.join(FIELD),
	}));
}

export function worktreesOf(porcelain: string): Worktree[] {
	return porcelain
		.split("\n\n")
		.map((block) => block.split("\n"))
		.flatMap((lines) => {
			const first = lines[0] ?? "";
			return first.startsWith(WORKTREE_LINE)
				? [
						{
							path: first.slice(WORKTREE_LINE.length),
							branch: lines.find((line) => line.startsWith(BRANCH_LINE))?.slice(BRANCH_LINE.length) ?? null,
						},
					]
				: [];
		});
}

export function changedCountOf(porcelain: string): number {
	return porcelain.split("\n").filter((line) => line !== "").length;
}

export function pathsOf(nulSeparated: string): string[] {
	return nulSeparated.split("\0").filter((path) => path !== "");
}

function secondsOf(field: string): number {
	const seconds = Number(field);
	return Number.isInteger(seconds) ? seconds : 0;
}

function rowsOf(text: string): string[][] {
	return text
		.split("\n")
		.filter((line) => line !== "")
		.map((line) => line.split(FIELD));
}
