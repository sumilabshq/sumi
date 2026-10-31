import { createElement } from "react";
import { CONTRACT_VERSION, MemoryDocStore, StorageClient } from "@sumi/contract";
import type { AppManifest, DocStore } from "@sumi/contract";
import type { StartedApp } from "../packages/shared/core/src/requests/index.ts";
import { AcceptTaskCommand, BoardQuery, CreateTaskCommand } from "../packages/domain/tasks/generated/contract.ts";
import { AppFacesQuery } from "../packages/domain/app-host/generated/contract.ts";
import { FailAppVersionCommand, InstallAppCommand } from "../packages/state/app-installer/index.ts";
import { MemoryAppsGateway } from "../packages/state/app-installer/gateways/apps/memory.gateway.ts";
import { frameServicesOf } from "../apps/studio/src/features/app-frame/lib/frame-services.ts";
import { appPageOf } from "../apps/studio/src/frame/app-page-of.tsx";
import { heldAppsOf } from "./app-installer-fixture.ts";
import { studioFakesOf } from "./app-host-fixture.ts";
import { check, tally } from "./check-helpers.ts";
import { frameChecks } from "./tasks-app-frame-checks.ts";
import { frameStorageOn, keptOn, seededStore, shellOver, taskIn, withTask } from "./tasks-app-fixture.ts";
import { linkChecks } from "./tasks-app-link-checks.ts";
import { replaceRuleChecks } from "./tasks-app-rules-checks.ts";

console.info = () => undefined;
console.warn = () => undefined;
console.error = () => undefined;

const SHELL_TASK = {
	chat: "chat-1",
	title: "Shell's task",
	description: "",
	kind: "code" as const,
	acceptance: [],
	plan: [],
	status: "todo" as const,
};
const READY_TASK = 147;

async function storageChecks(): Promise<void> {
	const shell = shellOver(new MemoryDocStore());
	const storage = frameStorageOn(shell);

	check("an empty board reads at rev 0", await storage({ op: "read", key: "tasks" }), {
		ok: true,
		output: { doc: { nextNumber: 1, tasks: [] }, rev: 0 },
	});

	await shell.send(CreateTaskCommand, SHELL_TASK);
	const { board, rev } = await keptOn(shell);
	check("a task the shell wrote is read through storage", [rev, board.tasks.length], [1, 1]);

	const renamed = withTask(board, 1, { title: "Renamed by the app" });
	check("a write over the read rev lands", await storage({ op: "write", key: "tasks", doc: renamed, baseRev: 1 }), {
		ok: true,
		output: { ok: true, rev: 2 },
	});
	check("the shell sees the board the app wrote", taskIn((await keptOn(shell)).board, 1).title, "Renamed by the app");
	check(
		"a write over an old rev is answered stale with the rev that won",
		await storage({ op: "write", key: "tasks", doc: renamed, baseRev: 1 }),
		{ ok: true, output: { ok: false, why: "stale", rev: 2 } },
	);

	const notABoard = await storage({ op: "write", key: "tasks", doc: { tasks: "x" }, baseRev: 2 });
	check(
		"a document that is not a board is refused, nothing written",
		[notABoard.ok, (await keptOn(shell)).rev],
		[false, 2],
	);
	check("a key Sumi keeps nothing under is refused", await storage({ op: "read", key: "chats" }), {
		ok: false,
		reason: 'Sumi keeps no "chats" for tasks',
	});
	check("another app asking for tasks is refused", await frameStorageOn(shell, "hello")({ op: "read", key: "tasks" }), {
		ok: false,
		reason: 'Sumi keeps no "tasks" for hello',
	});
	check("an ask of the wrong shape is refused", (await storage({ op: "delete", key: "tasks" })).ok, false);
	check("an unknown service is refused", await frameServicesOf("tasks", shell.send.bind(shell))("chats", {}), {
		ok: false,
		reason: 'Sumi has no service "chats" yet',
	});
}

function clientOn(shell: StartedApp): StorageClient {
	const services = frameServicesOf("tasks", shell.send.bind(shell));
	return new StorageClient({ ask: (service, input) => services(service, input) });
}

async function appModuleChecks(): Promise<void> {
	const shell = shellOver(seededStore());
	const client = clientOn(shell);
	let isShellFirst = true;
	const raced: DocStore = {
		read: (key) => client.read(key),
		write: async (key, doc, baseRev) => {
			if (isShellFirst) {
				isShellFirst = false;
				await shell.send(CreateTaskCommand, SHELL_TASK);
			}

			return client.write(key, doc, baseRev);
		},
	};
	const page = shellOver(raced);
	const accepted = await page.send(AcceptTaskCommand, { task: `T-${READY_TASK}` });
	const { board } = await keptOn(shell);
	check(
		"the app's Accept, written over a rev the shell moved, re-reads and keeps both",
		[accepted.ok, taskIn(board, READY_TASK).status, board.tasks.some((task) => task.title === SHELL_TASK.title)],
		[true, "done", true],
	);
	check("the app reads the same board", (await page.send(BoardQuery, {})).ok, true);
}

const TASKS_MANIFEST: AppManifest = {
	id: "tasks",
	name: "Tasks",
	version: "0.1.0",
	contract: `^${CONTRACT_VERSION.split(".").slice(0, 2).join(".")}`,
	ui: "index.html",
	modules: [{ name: "tasks", runs: "page" }],
	mcp: false,
	navigates: true,
};

async function facesOn(studio: StartedApp) {
	const faces = await studio.send(AppFacesQuery);
	return faces.ok ? faces.output.faces : [];
}

async function tasksFaceIsBuiltIn(studio: StartedApp): Promise<boolean | null> {
	return (await facesOn(studio)).find((face) => face.app === "tasks")?.isBuiltIn ?? null;
}

async function dispatchChecks(): Promise<void> {
	const apps = new MemoryAppsGateway(
		heldAppsOf(
			{ apps: [{ id: "tasks", source: { kind: "folder", path: "/tasks" } }] },
			{
				"/tasks": {
					manifest: TASKS_MANIFEST,
					release: { app: "tasks", version: "0.1.0", files: [] },
					manifestSha256: "0".repeat(64),
				},
			},
		),
	);
	const studio = studioFakesOf({ apps }).studioApp;

	check("before an install a tasks tab is the built-in page", await tasksFaceIsBuiltIn(studio), true);

	const installed = await studio.send(InstallAppCommand, { id: "tasks" });
	check("tasks installs", installed.ok ? true : installed.reason, true);
	check("an installed, current tasks takes the tasks tab", await tasksFaceIsBuiltIn(studio), false);

	const builtIn = createElement("i");
	const frame = createElement("b");
	const drawn = async () =>
		appPageOf({
			app: "tasks",
			faces: await facesOn(studio),
			builtIn: {
				tasks: () => builtIn,
				canvas: () => builtIn,
				browser: () => builtIn,
				terminal: () => builtIn,
			},
			installed: () => frame,
		}).type;
	check("the page drawn for it is the installed frame", await drawn(), "b");

	await studio.send(FailAppVersionCommand, { id: "tasks", version: "0.1.0" });
	check("with no current version the built-in Tasks page is back", await tasksFaceIsBuiltIn(studio), true);
	check("and it is the page drawn", await drawn(), "i");
}

await storageChecks();
await appModuleChecks();
await replaceRuleChecks();
await linkChecks();
await dispatchChecks();
await frameChecks();

if (tally.failed > 0) {
	console.log(`tasks app: ${tally.failed} check(s) failed`);
	process.exit(1);
}

console.log("tasks app: all checks passed");
