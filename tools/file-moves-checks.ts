import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { runtime, orpcTransport } from "../packages/shared/data-framework/src/index.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import { dataFrameworkMiddleware } from "../packages/shared/data-framework/src/server/index.ts";
import { AppTabQuery, FileSystemModule, PlacesModule } from "@sumi/contract";
import { PlacesModule as RunnablePlacesModule } from "../plugins/apps/data/places/module.ts";
import { MemoryTabsGateway } from "../plugins/apps/data/places/gateways/tabs/memory.gateway.ts";
import { MemoryWindowsGateway } from "../plugins/apps/data/places/gateways/windows/memory.gateway.ts";
import { FileSystemModule as RunnableFileSystemModule } from "../apps/tauri/capabilities/file-system/module.ts";
import { NodeFilesGateway } from "../apps/tauri/capabilities/file-system/gateways/files/node.gateway.ts";
import { FilePageModule } from "../plugins/files/data/file-page/module.ts";
import { APP_CALLER_HEADER, AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { check, tally } from "./check-helpers.ts";
import { builtInPlacedApps } from "./placed-apps-fixture.ts";
import { placedTabsOf } from "./places-fixture.ts";

const VIEWER = "code-viewer";
const focus = new EventTarget();
Object.assign(globalThis, { window: focus });

const folder = await fs.mkdtemp(path.join(os.tmpdir(), "file-moves-"));
const notes = path.join(folder, "notes.md");
const renamed = path.join(folder, "renamed.md");
const gone = path.join(folder, "gone.md");
await fs.writeFile(notes, "# notes");
await fs.writeFile(gone, "# gone");

const served = dataFrameworkMiddleware(
	runtime()
		.modules(
			RunnablePlacesModule({
				injects: {
					windows: new MemoryWindowsGateway({ windows: [] }),
					placedApps: builtInPlacedApps(),
					tabs: new MemoryTabsGateway(
						placedTabsOf({
							tabs: [
								{ id: "tab-notes", app: VIEWER, pageId: null, label: null, lastAddress: notes },
								{ id: "tab-gone", app: VIEWER, pageId: null, label: null, lastAddress: gone },
							],
							shownId: "tab-notes",
							minted: 2,
							closed: [],
						}),
					),
				},
			}),
			RunnableFileSystemModule({ injects: { files: new NodeFilesGateway(folder, "file-moves") } }),
		)
		.start({ platform: "server", env: {}, scope: { workspaceId: "file-moves" } }),
	{ authenticate: new AppCallerAuthenticate() },
);
const transport = orpcTransport("http://file-moves.test", {
	fetch: served.fetch,
	headers: () => ({ [APP_CALLER_HEADER]: VIEWER }),
});

function tabAppOf(tabId: string): Runtime {
	return runtime()
		.modules(FilePageModule({ tabId }))
		.imports(FileSystemModule({ over: transport }), PlacesModule({ over: transport }))
		.start({ platform: "browser", scope: { workspaceId: "file-moves" } });
}

const tabs = [tabAppOf("tab-notes"), tabAppOf("tab-gone")];

async function addressesOf(): Promise<unknown> {
	const answers = await Promise.all(["tab-notes", "tab-gone"].map((id) => tabs[0]?.send(AppTabQuery, { id })));
	return answers.map((answer) => (answer?.ok ? answer.output.address : answer?.reason));
}

async function settled(): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, 300));
}

console.info = () => undefined;
focus.dispatchEvent(new Event("blur"));
await settled();
await fs.rename(notes, renamed);
await fs.rm(gone);
focus.dispatchEvent(new Event("focus"));
await settled();
check(
	"a file tab follows its file renamed while the window was away; a deleted file's tab stays",
	await addressesOf(),
	[renamed, gone],
);
focus.dispatchEvent(new Event("blur"));
await settled();
focus.dispatchEvent(new Event("focus"));
await settled();
check("leaving and coming back with nothing renamed moves nothing", await addressesOf(), [renamed, gone]);
await fs.rm(folder, { recursive: true, force: true });
console.log(tally.failed ? `file moves: ${tally.failed} check(s) failed` : "file moves: all checks passed");
process.exit(tally.failed ? 1 : 0);
