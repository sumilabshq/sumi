import { FileInfoQuery, ReadFolderQuery, RunProgramCommand } from "@sumi/contract";
import type { ProgramOutput } from "@sumi/contract";
import { Repeatable, refuse } from "@widgetarium/data-framework";
import type { Send } from "@widgetarium/data-framework";
import { command, query } from "#module";
import {
	BranchesSchema,
	CommitsSchema,
	ComparisonInputSchema,
	ComparisonSchema,
	FileDiffInputSchema,
	FileDiffSchema,
	FolderInputSchema,
	GitPlaceSchema,
	LastCommitSchema,
	NearbyReposSchema,
	RangeInputSchema,
	RootInputSchema,
	UncommittedSchema,
	UntrackedFileInputSchema,
} from "../../shared/schema/git.schema.js";
import type { DiffRange, FileDiff, RepoRow } from "../../shared/schema/git.schema.js";
import { changedFilesOf, diffArgsOf } from "./lib/changed-files.js";
import { comparisonOf, fileDiffsOf, untrackedDiffsOf } from "./lib/file-diffs.js";
import { folderIn, nameOf, parentOf } from "./lib/folder-names.js";
import {
	BRANCH_FORMAT,
	COMMIT_FORMAT,
	STASH_FORMAT,
	branchesOf,
	changedCountOf,
	commitsOf,
	pathsOf,
	stashesOf,
	worktreesOf,
} from "./lib/git-lists.js";
import type { Worktree } from "./lib/git-lists.js";

interface CheckedOut {
	readonly head: string;
	readonly worktree: string | null;
}

const GIT_PROGRAM = "git";
const GIT_QUIET_ARGS = [
	"--no-optional-locks",
	"-c",
	"core.fsmonitor=false",
	"-c",
	"core.pager=cat",
	"-c",
	"core.quotepath=false",
	"-c",
	"diff.external=",
	"-c",
	"color.ui=false",
];
const DIFF_FLAGS = ["--no-ext-diff", "--no-textconv", "--no-color", "-M", "-U3"];
const OPTIONS_END = "--end-of-options";
const GIT_FOLDER = ".git";
const LAST_COMMIT = LastCommitSchema.value;
const UNCOMMITTED = UncommittedSchema.value;
const LINE_LIMIT = 4000;
const UNTRACKED_LIMIT = 120;
const LINE_COUNTER = "wc";
const REPO_LIMIT = 60;
const WORKTREE_LIMIT = 24;
const NO_HISTORY = "{base} and {head} share no history.";
const NOT_SHOWN = "{path} has no changes to show.";
const NOTHING_UNCOMMITTED: DiffRange = {
	kind: "working",
	from: LAST_COMMIT,
};
const GIT_FAILED = "git {call} failed in {folder}: {reason}";

export const GitPlaceQuery = query("git-place")
	.public()
	.input(FolderInputSchema)
	.output(GitPlaceSchema)
	.handle(async ({ folder }, { send }) => {
		const top = await gitOutput(send, folder, ["rev-parse", "--show-toplevel"]).catch(() => null);

		if (top === null) {
			return {
				kind: "missing" as const,
				folder,
			};
		}

		if (top.code !== 0) {
			return {
				kind: "folder" as const,
				folder,
				repos: await repoRowsIn(send, folder),
			};
		}

		const root = top.out.trim();
		return {
			kind: "repo" as const,
			root,
			name: nameOf(root),
			parent: parentOf(root),
			branch: await branchAt(send, root),
		};
	});

export const NearbyReposQuery = query("nearby-repos")
	.public()
	.input(RootInputSchema)
	.output(NearbyReposSchema)
	.handle(async ({ root }, { send }) => ({
		parent: parentOf(root),
		repos: await repoRowsIn(send, parentOf(root)),
	}));

export const BranchesQuery = query("branches")
	.public()
	.input(RootInputSchema)
	.output(BranchesSchema)
	.handle(async ({ root }, { send }) => {
		const [refs, stashes, worktrees] = await Promise.all([
			outputOrRefuse(send, root, ["for-each-ref", "--sort=-committerdate", BRANCH_FORMAT, "refs/heads"]),
			outputOrRefuse(send, root, ["stash", "list", STASH_FORMAT]),
			worktreesIn(send, root),
		]);
		const changed = await changedCountsIn(send, worktrees.slice(0, WORKTREE_LIMIT));
		return {
			branches: branchesOf(refs).map((branch) => {
				const worktree = worktreeOf(worktrees, branch.name);
				return {
					...branch,
					worktree,
					changed: worktree === null ? null : (changed.get(worktree) ?? null),
				};
			}),
			stashes: stashesOf(stashes),
		};
	});

export const CommitsQuery = query("commits")
	.public()
	.input(RangeInputSchema)
	.output(CommitsSchema)
	.handle(async ({ root, head, base }, { send }) => {
		const checkedOut = await checkedOutOf(send, root, head);
		const uncommitted =
			checkedOut.worktree === null
				? null
				: changedCountOf(await outputOrRefuse(send, checkedOut.worktree, ["status", "--porcelain"]));
		return {
			commits:
				base === LAST_COMMIT
					? []
					: commitsOf(await outputOrRefuse(send, root, ["log", COMMIT_FORMAT, OPTIONS_END, `${base}..${checkedOut.head}`])),
			uncommitted,
		};
	});

export const ComparisonQuery = query("comparison")
	.public()
	.input(ComparisonInputSchema)
	.output(ComparisonSchema)
	.handle(async ({ root, head, base, only }, { send }) => {
		const checkedOut = await checkedOutOf(send, root, head);
		const folder = checkedOut.worktree ?? root;
		const range = await rangeOf(send, folder, checkedOut, { base, only });

		if (range === null) {
			return comparisonOf([], folder, NOTHING_UNCOMMITTED);
		}

		const [changed, untracked] = await Promise.all([
			changedFilesIn(send, folder, range),
			range.kind === "working" ? untrackedFilesIn(send, folder) : Promise.resolve([]),
		]);
		return comparisonOf([...changed, ...untracked], folder, range);
	});

export const FileDiffQuery = query("file-diff")
	.public()
	.input(FileDiffInputSchema)
	.output(FileDiffSchema)
	.handle(async ({ folder, range, path, from }, { send }) => {
		const paths = from === null ? [path] : [from, path];
		const [diff] = fileDiffsOf(await outputOrRefuse(send, folder, diffArgsOf(range, DIFF_FLAGS, paths)), LINE_LIMIT);
		return diff ?? refuse(NOT_SHOWN.replace("{path}", path));
	});

export const UntrackedFileQuery = query("untracked-file")
	.public()
	.input(UntrackedFileInputSchema)
	.output(FileDiffSchema)
	.handle(async ({ folder, path }, { send }) => {
		const shown = await gitOutput(send, folder, ["diff", "--no-index", ...DIFF_FLAGS, "--", "/dev/null", path]);
		const [diff] = fileDiffsOf(shown.out, LINE_LIMIT);
		return diff ?? refuse(NOT_SHOWN.replace("{path}", path));
	});

export const RereadGitCommand = command("reread-git")
	.public()
	.idempotencyKey(Repeatable)
	.handle((_input, { invalidate }) => {
		invalidate(GitPlaceQuery);
		invalidate(NearbyReposQuery);
		invalidate(BranchesQuery);
		invalidate(CommitsQuery);
		invalidate(ComparisonQuery);
		invalidate(FileDiffQuery);
		invalidate(UntrackedFileQuery);
	});

function gitOutput(send: Send, folder: string, args: readonly string[]): Promise<ProgramOutput> {
	return send(RunProgramCommand, {
		folder,
		program: GIT_PROGRAM,
		args: [...GIT_QUIET_ARGS, ...args],
	});
}

async function outputOrRefuse(send: Send, folder: string, args: readonly string[]): Promise<string> {
	const answer = await gitOutput(send, folder, args);

	if (answer.code !== 0) {
		return refuse(
			GIT_FAILED.replace("{call}", args[0] ?? "")
				.replace("{folder}", folder)
				.replace("{reason}", answer.err.trim()),
		);
	}

	return answer.out;
}

async function rangeOf(
	send: Send,
	folder: string,
	checkedOut: CheckedOut,
	{ base, only }: { readonly base: string; readonly only: string | null },
): Promise<DiffRange | null> {
	if (only === UNCOMMITTED || (only === null && base === LAST_COMMIT)) {
		return checkedOut.worktree === null ? null : NOTHING_UNCOMMITTED;
	}

	if (only !== null) {
		return {
			kind: "show",
			sha: only,
		};
	}

	const mergeBase = await gitOutput(send, folder, ["merge-base", OPTIONS_END, base, checkedOut.head]);

	if (mergeBase.code !== 0) {
		return refuse(NO_HISTORY.replace("{base}", base).replace("{head}", checkedOut.head));
	}

	const from = mergeBase.out.trim();
	return checkedOut.worktree === null
		? {
				kind: "commits",
				from,
				to: checkedOut.head,
			}
		: {
				kind: "working",
				from,
			};
}

async function changedFilesIn(send: Send, folder: string, range: DiffRange): Promise<FileDiff[]> {
	const [nameStatus, numstat] = await Promise.all([
		outputOrRefuse(send, folder, diffArgsOf(range, [...DIFF_FLAGS, "--name-status", "-z"], [])),
		outputOrRefuse(send, folder, diffArgsOf(range, [...DIFF_FLAGS, "--numstat", "-z"], [])),
	]);
	return changedFilesOf(nameStatus, numstat);
}

async function checkedOutOf(send: Send, root: string, head: string | null): Promise<CheckedOut> {
	if (head === null) {
		return {
			head: (await branchAt(send, root)) ?? LAST_COMMIT,
			worktree: root,
		};
	}

	return {
		head,
		worktree: worktreeOf(await worktreesIn(send, root), head),
	};
}

async function untrackedFilesIn(send: Send, worktree: string): Promise<FileDiff[]> {
	const untracked = await outputOrRefuse(send, worktree, ["ls-files", "--others", "--exclude-standard", "-z"]);
	const paths = pathsOf(untracked).slice(0, UNTRACKED_LIMIT);
	const lineCounts =
		paths.length === 0
			? ""
			: (
					await send(RunProgramCommand, {
						folder: worktree,
						program: LINE_COUNTER,
						args: ["-l", "--", ...paths],
					})
				).out;
	return untrackedDiffsOf(paths, lineCounts);
}

async function repoRowsIn(send: Send, folder: string): Promise<RepoRow[]> {
	const { entries } = await send(ReadFolderQuery, { path: folder });
	const folders = entries.filter(({ kind }) => kind === "folder").map(({ name }) => folderIn(folder, name));
	const checked = await Promise.all(
		folders.map(async (path) => ({
			path,
			isRepo: (await send(FileInfoQuery, { path: folderIn(path, GIT_FOLDER) })).exists,
		})),
	);
	return Promise.all(
		checked
			.filter(({ isRepo }) => isRepo)
			.slice(0, REPO_LIMIT)
			.map(({ path }) => repoRowAt(send, path)),
	);
}

async function repoRowAt(send: Send, path: string): Promise<RepoRow> {
	const [branch, status] = await Promise.all([branchAt(send, path), gitOutput(send, path, ["status", "--porcelain"])]);
	return {
		path,
		name: nameOf(path),
		branch,
		changed: status.code === 0 ? changedCountOf(status.out) : 0,
	};
}

async function branchAt(send: Send, root: string): Promise<string | null> {
	const head = await gitOutput(send, root, ["rev-parse", "--abbrev-ref", "HEAD"]);
	return head.code === 0 ? head.out.trim() : null;
}

async function worktreesIn(send: Send, root: string): Promise<Worktree[]> {
	return worktreesOf(await outputOrRefuse(send, root, ["worktree", "list", "--porcelain"]));
}

function worktreeOf(worktrees: readonly Worktree[], branch: string): string | null {
	return worktrees.find((worktree) => worktree.branch === branch)?.path ?? null;
}

async function changedCountsIn(send: Send, worktrees: readonly Worktree[]): Promise<Map<string, number>> {
	const counted = await Promise.all(
		worktrees.map(async ({ path }) => {
			const status = await gitOutput(send, path, ["status", "--porcelain"]);
			return [path, status.code === 0 ? changedCountOf(status.out) : 0] as const;
		}),
	);
	return new Map(counted);
}
