import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { app, localTransport, messagePortListener, messagePortTransport } from "@widgetarium/core/requests";
import type { LocalTransport } from "@widgetarium/core/requests";
import { server } from "@widgetarium/core/requests/server";
import { FileSystemModule, ReadFileQuery } from "@widgetarium/file-system";
import { FileSystemModule as RunnableFileSystemModule } from "@widgetarium/file-system/module";
import { BoardQuery, CreateTaskCommand, TasksModule } from "@widgetarium/tasks";
import { TasksModule as RunnableTasksModule } from "@widgetarium/tasks/module";
import { NodeFilesGateway } from "../packages/domain/file-system/gateways/files/node.gateway.ts";
import { tasksBoardFileOver } from "../apps/host-tauri/src/core-link/tasks-board-file.ts";
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
	server()
		.modules(RunnableFileSystemModule.with({ files: new NodeFilesGateway(appData, workspaceId) }), RunnableTasksModule)
		.listen(coreTransport)
		.start({
			env: {},
			scope: {
				workspaceId,
			},
			host: {
				file: tasksBoardFileOver(coreTransport),
				authenticate: new AppCallerAuthenticate(),
			},
		});
	return coreTransport;
}

function boardFileOf(workspaceId: string): string {
	return path.join(appData, "app-data", workspaceId, "tasks", "tasks.json");
}

const coreTransport = startCore(WORKSPACE);
const otherCoreTransport = startCore(OTHER_WORKSPACE);

const core = app().imports(TasksModule.over(coreTransport)).start();
const created = await core.send(CreateTaskCommand, {
	chat: "chat-1",
	title: TITLE,
	kind: "research",
	acceptance: ["the page shows it"],
	plan: ["create it"],
});
check("the core creates a task, as the agent's tools do", created.ok, true);

const relay = createFrameRelay([
	{
		module: TasksModule,
		transport: coreTransport,
		hears: hearsAll,
	},
	{
		module: FileSystemModule,
		transport: coreTransport,
		hears: hearsAll,
	},
]);
const channel = new MessageChannel();
const stopServing = messagePortListener(channel.port1, { headers: { [APP_CALLER_HEADER]: "tasks" } }).serve(relay);
const frameTransport = messagePortTransport(channel.port2);
const page = app().imports(TasksModule.over(frameTransport), FileSystemModule.over(frameTransport)).start();

const board = await page.send(BoardQuery, {});
check("the page reads that task through the frame", board.ok && JSON.stringify(board.output).includes(TITLE), true);

const tasksFileRead = await page.send(ReadFileQuery, { path: "tasks.json" });
check("the board is kept in the tasks app's own tasks.json", tasksFileRead.ok && tasksFileRead.output.includes(TITLE), true);
check(
	"that file sits under app-data/<workspace>/tasks",
	existsSync(boardFileOf(WORKSPACE)) && readFileSync(boardFileOf(WORKSPACE), "utf8").includes(TITLE),
	true,
);

const otherCore = app().imports(TasksModule.over(otherCoreTransport)).start();
const otherBoard = await otherCore.send(BoardQuery, {});
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
