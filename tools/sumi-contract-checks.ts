import { readFileSync } from "node:fs";
import { app, messagePortListener, messagePortTransport } from "@widgetarium/core/requests";
import { server } from "@widgetarium/core/requests/server";
import { CONTRACT_VERSION, contractRefusal, defineApp } from "../packages/shared/contract/index.ts";
import { ReadFileQuery, WriteFileCommand, FileSystemModule } from "../packages/shared/contract/index.ts";
import { MemoryFilesGateway } from "../packages/domain/file-system/gateways/files/memory.gateway.ts";
import { FileSystemModule as RunnableFileSystemModule } from "../packages/domain/file-system/module.ts";
import { AppCallerAuthenticate, APP_CALLER_HEADER } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { check, tally, thrownBy } from "./check-helpers.ts";

const MANIFEST = {
	id: "tasks",
	name: "Tasks",
	version: "1.0.0",
	contract: "^0.1",
	ui: "index.html",
};

check("a newer minor of the same major serves an older app", contractRefusal("^1.4", "1.7.0"), null);
check(
	"an app needing a newer minor asks for a Sumi update",
	contractRefusal("^1.9", "1.7.0")?.includes("update Sumi"),
	true,
);
check(
	"an app built for an older major asks for an app update",
	contractRefusal("^1.4", "2.0.0")?.includes("update the app"),
	true,
);
check(
	"an app built for a newer major asks for a Sumi update",
	contractRefusal("^2.0", "1.7.0")?.includes("update Sumi"),
	true,
);
check(
	"before 1.0 a minor is a breaking line",
	[contractRefusal("^0.1", "0.1.3"), contractRefusal("^0.1", "0.2.0")?.includes("update the app")],
	[null, true],
);
check(
	"a range that is not ^major.minor is refused with the shape it needs",
	contractRefusal("1.4", "1.7.0")?.includes("^major.minor"),
	true,
);
check(
	"^0.0.x pins the exact patch",
	[contractRefusal("^0.0.3", "0.0.3"), contractRefusal("^0.0.3", "0.0.9")?.includes("update the app")],
	[null, true],
);
check(
	"the contract version is the package version",
	CONTRACT_VERSION,
	JSON.parse(readFileSync("packages/shared/contract/package.json", "utf8")).version,
);
check("a manifest fills what it leaves out", [defineApp(MANIFEST).modules, defineApp(MANIFEST).mcp], [[], false]);
check(
	"an id with capitals is refused",
	thrownBy(() => defineApp({ ...MANIFEST, id: "Tasks" })).includes("lowercase"),
	true,
);

const core = server()
	.modules(RunnableFileSystemModule.with({ files: new MemoryFilesGateway("/data") }))
	.start({ env: {}, host: { authenticate: new AppCallerAuthenticate() } });
const channel = new MessageChannel();
const stopServing = messagePortListener(channel.port1, { headers: { [APP_CALLER_HEADER]: "notes" } }).serve(core);
const heard = { changes: 0 };
const transport = messagePortTransport(channel.port2);
transport.changes(() => {
	heard.changes += 1;
});
const sumi = app().imports(FileSystemModule.over(transport)).start();
await sumi.send(WriteFileCommand, { path: "a.txt", content: "over a port" });
const read = await sumi.send(ReadFileQuery, { path: "a.txt" });
check(
	"a call over a MessagePort is answered, stamped by the listener",
	read.ok ? read.output : read.reason,
	"over a port",
);
check("a change crosses the port to the calling side", heard.changes > 0, true);
stopServing();
channel.port2.close();

console.log(tally.failed ? `sumi contract: ${tally.failed} check(s) failed` : "sumi contract: all checks passed");
process.exit(tally.failed ? 1 : 0);
