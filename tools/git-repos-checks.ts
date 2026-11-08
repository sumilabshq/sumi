import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { orpcTransport, runtime } from "@widgetarium/data-framework";
import { dataFrameworkMiddleware } from "@widgetarium/data-framework/server";
import { FileSystemModule as FileSystemContract, TerminalModule as TerminalContract } from "@sumi/contract";
import {
	BranchesQuery,
	CommitsQuery,
	ComparisonQuery,
	FileDiffQuery,
	GitPlaceQuery,
	NearbyReposQuery,
} from "../plugins/git/data/git/index.ts";
import { GitModule } from "../plugins/git/data/git/module.ts";
import { NodeFilesGateway } from "../apps/tauri/capabilities/file-system/gateways/files/node.gateway.ts";
import { FileSystemModule } from "../apps/tauri/capabilities/file-system/module.ts";
import { NodeProgramsGateway } from "../apps/tauri/capabilities/terminal/gateways/programs/node.gateway.ts";
import { MemoryTerminalSessionsGateway } from "../apps/tauri/capabilities/terminal/gateways/terminal-sessions/memory.gateway.ts";
import { TerminalModule } from "../apps/tauri/capabilities/terminal/module.ts";
import { AppCallerAuthenticate, APP_CALLER_HEADER } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { check, tally } from "./check-helpers.ts";

const parent = realpathSync(mkdtempSync(path.join(tmpdir(), "sumi-git-checks-")));
const repo = path.join(parent, "app");
const worktree = path.join(parent, "app-feat");
const IDENTITY = {
	...process.env,
	GIT_AUTHOR_NAME: "Checks",
	GIT_AUTHOR_EMAIL: "checks@sumi.test",
	GIT_COMMITTER_NAME: "Checks",
	GIT_COMMITTER_EMAIL: "checks@sumi.test",
};

function git(folder: string, ...args: string[]): string {
	return execFileSync("git", args, {
		cwd: folder,
		env: IDENTITY,
	}).toString();
}

mkdirSync(repo);
mkdirSync(path.join(parent, "other"));
mkdirSync(path.join(parent, "notes"));
git(repo, "init", "-q", "-b", "main");
writeFileSync(path.join(repo, "a.txt"), "one\ntwo\nthree\n");
git(repo, "add", "a.txt");
git(repo, "commit", "-q", "-m", "First");
git(path.join(parent, "other"), "init", "-q", "-b", "main");
git(repo, "worktree", "add", "-q", "-b", "feat", worktree);
writeFileSync(path.join(worktree, "a.txt"), "one\nTWO\nthree\n");
git(worktree, "commit", "-q", "-am", "Shout two");
const featSha = git(worktree, "rev-parse", "HEAD").trim();
writeFileSync(path.join(worktree, "a.txt"), "one\nTWO\nthree\nfour\n");
writeFileSync(path.join(worktree, "new.txt"), "fresh\n");

const core = runtime()
	.modules(
		FileSystemModule({ injects: { files: new NodeFilesGateway(parent, "git-checks") } }),
		TerminalModule({
			injects: {
				sessions: new MemoryTerminalSessionsGateway(),
				programs: new NodeProgramsGateway(),
			},
		}),
	)
	.start({ platform: "server", env: {} });
const served = dataFrameworkMiddleware(core, { authenticate: new AppCallerAuthenticate() });
const toCore = orpcTransport("http://checks.test", {
	fetch: served.fetch,
	headers: () => ({ [APP_CALLER_HEADER]: "git" }),
});
const app = runtime()
	.modules(GitModule)
	.imports(TerminalContract({ over: toCore }), FileSystemContract({ over: toCore }))
	.start({ platform: "browser", scope: { workspaceId: "git-checks" } });

const place = await app.send(GitPlaceQuery, { folder: path.join(repo, ".") });
check(
	"a folder inside a repository answers its root, name and branch",
	place.ok && place.output.kind === "repo" ? [place.output.root, place.output.name, place.output.branch] : place,
	[repo, "app", "main"],
);

const plain = await app.send(GitPlaceQuery, { folder: parent });
check(
	"a folder with no repository lists the repositories inside it",
	plain.ok && plain.output.kind === "folder" ? plain.output.repos.map(({ name }) => name) : plain,
	["app", "app-feat", "other"],
);

const missing = await app.send(GitPlaceQuery, { folder: path.join(parent, "gone") });
check("a folder that does not exist answers missing", missing.ok ? missing.output.kind : missing, "missing");

const nearby = await app.send(NearbyReposQuery, { root: repo });
check("the repositories beside a root are its parent's", nearby.ok ? nearby.output.parent : nearby, parent);

const branches = await app.send(BranchesQuery, { root: repo });
const feat = branches.ok ? branches.output.branches.find(({ name }) => name === "feat") : undefined;
check(
	"a branch checked out in a worktree names it and counts its changes",
	[feat?.worktree, feat?.changed],
	[worktree, 2],
);

const commits = await app.send(CommitsQuery, { root: repo, head: "feat", base: "main" });
check(
	"the commits of a branch against main, and its uncommitted count",
	commits.ok ? [commits.output.commits.map(({ title }) => title), commits.output.uncommitted] : commits,
	[["Shout two"], 2],
);

const whole = await app.send(ComparisonQuery, { root: repo, head: "feat", base: "main", only: null });
check(
	"against main: committed and uncommitted changes and the untracked file",
	whole.ok ? whole.output.files.map(({ path: file, status, added, removed }) => [file, status, added, removed]) : whole,
	[
		["a.txt", "modified", 2, 1],
		["new.txt", "added", 1, 0],
	],
);

const fileLines = whole.ok
	? await app.send(FileDiffQuery, {
			folder: whole.output.folder,
			range: whole.output.range,
			path: "a.txt",
			from: null,
		})
	: whole;
check(
	"one file's lines load on their own, against the range the comparison answered",
	fileLines.ok
		? fileLines.output.hunks.flatMap(({ lines }) =>
				lines.filter(({ kind }) => kind !== "context").map(({ kind, text }) => `${kind}:${text}`),
			)
		: fileLines,
	["removed:two", "added:TWO", "added:four"],
);
check(
	"the comparison itself carries no lines, only counts",
	whole.ok ? whole.output.files.every(({ hunks }) => hunks.length === 0) : whole,
	true,
);

const uncommitted = await app.send(ComparisonQuery, { root: repo, head: "feat", base: "HEAD", only: null });
check(
	"against the last commit: only what is not committed",
	uncommitted.ok ? uncommitted.output.files.map(({ path: file, added, removed }) => [file, added, removed]) : uncommitted,
	[
		["a.txt", 1, 0],
		["new.txt", 1, 0],
	],
);

const oneCommit = await app.send(ComparisonQuery, { root: repo, head: "feat", base: "main", only: featSha });
check(
	"one commit shows only its own change",
	oneCommit.ok ? oneCommit.output.files.map(({ path: file, added, removed }) => [file, added, removed]) : oneCommit,
	[["a.txt", 1, 1]],
);

const flag = await app.send(ComparisonQuery, { root: repo, head: "--output=x", base: "main", only: null });
check("a revision that reads as a flag is refused before git runs", flag.ok, false);

rmSync(parent, { recursive: true, force: true });
console.log(tally.failed ? `git repos: ${tally.failed} check(s) failed` : "git repos: all checks passed");
process.exit(tally.failed ? 1 : 0);
