import { app, orpcTransport } from "@widgetarium/framework";
import type { StartedApp } from "@widgetarium/framework";
import { server } from "@widgetarium/framework/server";
import {
	AppendFileCommand,
	CopyCommand,
	FileInfoQuery,
	FileSystemModule,
	MakeFolderCommand,
	ReadFileQuery,
	ReadFolderQuery,
	RemoveCommand,
	RenameCommand,
	WriteFileCommand,
} from "../packages/domain/file-system/index.ts";
import { MemoryFilesGateway } from "../packages/domain/file-system/gateways/files/memory.gateway.ts";
import { FileSystemModule as RunnableFileSystemModule } from "../packages/domain/file-system/module.ts";
import { placedPathOf } from "../packages/domain/file-system/shared/lib/app-path.ts";
import { AppCallerAuthenticate, APP_CALLER_HEADER } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { check, tally } from "./check-helpers.ts";

const APP_DATA = "/data";
const WORKSPACE = "ws-1";
const ROOT = {
	appDataFolder: APP_DATA,
	workspaceId: WORKSPACE,
};
const files = new MemoryFilesGateway(APP_DATA, WORKSPACE);
const served = server()
	.modules(RunnableFileSystemModule.with({ files }))
	.start({ env: {}, host: { authenticate: new AppCallerAuthenticate() } });

function appOver(id: string | null): StartedApp {
	const headers = (): Record<string, string> => (id === null ? {} : { [APP_CALLER_HEADER]: id });
	return app()
		.imports(FileSystemModule.over(orpcTransport("http://checks.test", { fetch: served.fetch, headers })))
		.start();
}

const notes = appOver("notes");
const other = appOver("other");
const nobody = appOver(null);

const user = (id: string) => ({ id, permissions: [] });
check("a relative path lands in the app's own data folder", placedPathOf(ROOT, user("notes"), "a/b.txt"), {
	path: "/data/app-data/ws-1/notes/a/b.txt",
});
check("an absolute path is taken as given", placedPathOf(ROOT, user("notes"), "/tmp/x"), { path: "/tmp/x" });
check("a path climbing out is refused", "refusal" in placedPathOf(ROOT, user("notes"), "a/../../b"), true);
check("an app id that is not a folder name is refused", "refusal" in placedPathOf(ROOT, user("../x"), "a"), true);
check("a call with no app is refused", "refusal" in placedPathOf(ROOT, null, "a"), true);
check(
	"a workspace id that is not a folder name is refused",
	"refusal" in placedPathOf({ appDataFolder: APP_DATA, workspaceId: "../x" }, user("notes"), "a"),
	true,
);

const written = await notes.send(WriteFileCommand, { path: "todo.txt", content: "one" });
await notes.send(AppendFileCommand, { path: "todo.txt", content: " two" });
const read = await notes.send(ReadFileQuery, { path: "todo.txt" });
check("write then append then read answers both", [written.ok, read.ok ? read.output : read.reason], [true, "one two"]);
check("the write landed in that app's folder", await files.readFile("/data/app-data/ws-1/notes/todo.txt"), "one two");

const othersRead = await other.send(ReadFileQuery, { path: "todo.txt" });
check(
	"another app's relative path is its own folder, so it misses",
	othersRead.ok ? "read" : othersRead.code,
	"refused",
);

const missing = await notes.send(FileInfoQuery, { path: "nothing.txt" });
check(
	"file info of a missing path answers without throwing",
	missing.ok ? missing.output.exists : missing.reason,
	false,
);

await notes.send(MakeFolderCommand, { path: "box" });
await notes.send(CopyCommand, { from: "todo.txt", to: "box/copy.txt" });
await notes.send(RenameCommand, { from: "box/copy.txt", to: "box/moved.txt" });
const listed = await notes.send(ReadFolderQuery, { path: "box" });
check("make, copy and rename leave one moved file", listed.ok ? listed.output.entries : listed.reason, [
	{ name: "moved.txt", kind: "file" },
]);
await notes.send(RemoveCommand, { path: "box" });
const gone = await notes.send(FileInfoQuery, { path: "box" });
check("remove takes a folder away", gone.ok ? gone.output.exists : gone.reason, false);

const anonymous = await nobody.send(ReadFileQuery, { path: "todo.txt" });
check("a caller with no app is refused before any handler", anonymous.ok ? "read" : anonymous.code, "unauthenticated");

console.log(
	tally.failed ? `file-system files: ${tally.failed} check(s) failed` : "file-system files: all checks passed",
);
process.exit(tally.failed ? 1 : 0);
