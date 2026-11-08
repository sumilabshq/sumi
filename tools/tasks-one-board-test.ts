import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { runtime, localTransport, messagePortTransport, relayPort } from "@widgetarium/data-framework";
import type { LocalTransport } from "@widgetarium/data-framework";
import { fileSystem } from "@widgetarium/file-system/contract";
import { fileSystem as RunnableFileSystemModule } from "@widgetarium/file-system/implementation";
import { tasks } from "@widgetarium/tasks/contract";
import { tasks as RunnableTasksModule } from "@widgetarium/tasks/implementation";
import { NodeFilesGateway } from "../apps/tauri/capabilities/file-system/gateways/files/node.gateway.ts";
import { tasksBoardFileOver } from "../apps/tauri/src/core-link/tasks-board-file.ts";
import { APP_CALLER_HEADER, AppCallerAuthenticate } from "../apps/studio/src/features/app-frame/lib/app-caller.ts";
import { check, tally } from "./check-helpers.ts";
import { createFrameRelay, hearsAll } from "../apps/studio/src/features/app-frame/lib/frame-relay.ts";

const WORKSPACE = "ws-1";
const OTHER_WORKSPACE = "ws-2";
const TITLE = "Seen by the agent and the page";
const HUNG_AFTER_MS = 30000;

const hangWatchdog = setTimeout(() => {
	console.log(`!!  a call never answered within ${HUNG_AFTER_MS} ms`);
	process.exit(1);
}, HUNG_AFTER_MS);
const appData = mkdtempSync(path.join(tmpdir(), "wg-tasks-one-board-"));

function startCore(workspaceId: string): LocalTransport {
	const coreTransport = localTransport();
	coreTransport.serve(
		runtime()
			.modules(
				RunnableFileSystemModule({ injects: { files: new NodeFilesGateway(appData, workspaceId) } }),
				RunnableTasksModule({
					file: tasksBoardFileOver(coreTransport),
				}),
			)
			.start({
				platform: "server",
				env: {},
				scope: {
					workspaceId,
				},
			}),
		{ authenticate: new AppCallerAuthenticate() },
	);
	return coreTransport;
}

function boardFileOf(workspaceId: string): string {
	return path.join(appData, "app-data", workspaceId, "tasks", "tasks.json");
}

const coreTransport = startCore(WORKSPACE);
const otherCoreTransport = startCore(OTHER_WORKSPACE);

const core = runtime()
	.imports(tasks({ over: coreTransport }))
	.start();
const created = await core.send(tasks.agentWork.create, {
	chat: "chat-1",
	title: TITLE,
	kind: "research",
	acceptance: ["the page shows it"],
	plan: ["create it"],
});
check("the core creates a task, as the agent's tools do", created.ok, true);

const relay = createFrameRelay([
	{
		module: tasks,
		transport: coreTransport,
		hears: hearsAll,
	},
	{
		module: fileSystem,
		transport: coreTransport,
		hears: hearsAll,
	},
]);
const channel = new MessageChannel();
const stopServing = relayPort(relay, channel.port1, { headers: { [APP_CALLER_HEADER]: "tasks" } });
const frameTransport = messagePortTransport(channel.port2);
const page = runtime()
	.imports(tasks({ over: frameTransport }), fileSystem({ over: frameTransport }))
	.start();

const board = await page.send(tasks.board.current, {});
check("the page reads that task through the frame", board.ok && JSON.stringify(board.output).includes(TITLE), true);

const tasksFileRead = await page.send(fileSystem.files.read, { path: "tasks.json" });
check(
	"the board is kept in the tasks app's own tasks.json",
	tasksFileRead.ok && tasksFileRead.output.includes(TITLE),
	true,
);
check(
	"that file sits under app-data/<workspace>/tasks",
	existsSync(boardFileOf(WORKSPACE)) && readFileSync(boardFileOf(WORKSPACE), "utf8").includes(TITLE),
	true,
);

const otherCore = runtime()
	.imports(tasks({ over: otherCoreTransport }))
	.start();
const otherBoard = await otherCore.send(tasks.board.current, {});
check(
	"another workspace's board does not hold that task",
	otherBoard.ok && !JSON.stringify(otherBoard.output).includes(TITLE),
	true,
);
check("and no file of another workspace was written", existsSync(boardFileOf(OTHER_WORKSPACE)), false);

stopServing();
channel.port2.close();
clearTimeout(hangWatchdog);

if (tally.failed > 0) {
	console.log(`tasks one board: ${tally.failed} failed`);
	process.exit(1);
}

console.log("tasks one board: all checks passed");
process.exit(0);
