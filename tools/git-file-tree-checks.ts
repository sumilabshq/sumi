import assert from "node:assert/strict";
import type { FileDiff } from "@sumi/git";
import { fileTreeRowsOf } from "../plugins/git/src/features/git-page/lib/file-tree.ts";

function changed(path: string, added = 1, removed = 0): FileDiff {
	return {
		path,
		from: null,
		status: "modified",
		added,
		removed,
		isBinary: false,
		isUntracked: false,
	} as FileDiff;
}

const files = [
	changed("apps/studio/src/a.ts", 2, 1),
	changed("apps/studio/src/b.ts", 3, 0),
	changed("apps/tauri/c.ts"),
	changed("README.md"),
];

const open = fileTreeRowsOf(files, new Set());
assert.deepEqual(
	open.map((row) => (row.kind === "folder" ? `${"  ".repeat(row.depth)}${row.name}/` : `${"  ".repeat(row.depth)}${row.file.path}`)),
	["apps/", "  studio/src/", "    apps/studio/src/a.ts", "    apps/studio/src/b.ts", "  tauri/", "    apps/tauri/c.ts", "README.md"],
	"folders first, single-child chains joined, files indented under their folder",
);
console.info("OK  tree rows: folders first, chains joined, files indented");

const apps = open[0];
assert.ok(apps?.kind === "folder" && apps.added === 6 && apps.removed === 1, "a folder sums its files");
console.info("OK  a folder sums the changes of everything inside it");

const closed = fileTreeRowsOf(files, new Set(["apps/studio/src"]));
assert.equal(
	closed.some((row) => row.kind === "file" && row.file.path.startsWith("apps/studio/src/")),
	false,
	"a closed folder hides its files",
);
console.info("OK  a closed folder hides what is inside it");
console.info("git file tree: all checks passed");
