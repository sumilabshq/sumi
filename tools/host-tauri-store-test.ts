import { z } from "zod";
import { check, tally } from "./check-helpers.ts";
import { SETTINGS, readSettings } from "../packages/host-tauri/src/settings/settings-doc.ts";
import { settingsPxMemory } from "../packages/host-tauri/src/settings/settings-px-memory.ts";

import { TauriOpening } from "../packages/host-tauri/src/startup/tauri-opening.ts";
import { GLOBAL_ROOT, StoreClient, folderRootOf } from "../packages/host-tauri/src/store/store-client.ts";
import { StoreRefusedError } from "../packages/host-tauri/src/store/store-invoke.ts";
import type { Invoke } from "../packages/host-tauri/src/store/store-invoke.ts";
import { WorkspaceClient } from "../packages/host-tauri/src/workspace/workspace-client.ts";
import type { WorkspaceEntry } from "../packages/host-tauri/src/workspace/workspace-docs.ts";
import { DEFAULT, FakeStore, RESEARCH, quietly } from "./host-tauri-fake-store.ts";

async function settingsChecks(): Promise<void> {
	const fake = new FakeStore();
	const settings = await readSettings(new StoreClient(fake.invoke));
	check("a missing settings.json reads as the defaults", settings.now(), {
		chatWidthPx: null,
		leftWidthPx: null,
		trace: false,
	});

	const memory = settingsPxMemory(settings, "chatWidthPx");
	for (const px of [400, 420, 440]) {
		memory.write(px);
	}
	check("a dragged width reads back at once", memory.read(), 440);
	await settings.flush();
	check(
		"three writes while dragging become one replace from rev 0",
		[fake.commandsCalled(), fake.calls[1]?.args["baseRev"], fake.files.get("global:settings.json")],
		[["read", "replace"], 0, { chatWidthPx: 440, leftWidthPx: null, trace: false, v: 1, rev: 1 }],
	);
}

async function staleRevChecks(): Promise<void> {
	const fake = new FakeStore();
	const settings = await readSettings(new StoreClient(fake.invoke));
	fake.put("global:settings.json", { v: 1, rev: 5, chatWidthPx: null, trace: true });
	settings.change({ chatWidthPx: 500 }, "resize");
	await quietly(() => settings.flush());
	check(
		"a stale rev re-reads, keeps the other writer's field and writes on top",
		[fake.commandsCalled(), fake.files.get("global:settings.json")],
		[["read", "replace", "read", "replace"], { chatWidthPx: 500, leftWidthPx: null, trace: true, v: 1, rev: 6 }],
	);
}

async function versionChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.put("global:settings.json", { v: 2, rev: 3, chatWidthPx: 300, trace: false });
	const store = new StoreClient(fake.invoke);
	const read = await store.readDoc(GLOBAL_ROOT, SETTINGS);
	const settings = await readSettings(store);
	settings.change({ chatWidthPx: 610 }, "resize");
	await quietly(() => settings.flush());
	check(
		"a newer v is read-only: read, never replaced",
		[read.isReadOnly, fake.commandsCalled(), fake.files.get("global:settings.json")?.["chatWidthPx"]],
		[true, ["read", "read"], 300],
	);
}

async function boundaryChecks(): Promise<void> {
	const fake = new FakeStore();
	const store = new StoreClient(fake.invoke);
	fake.answerOverride = { doc: "not a doc", rev: -1 };
	const malformed = await store.readDoc(GLOBAL_ROOT, SETTINGS).then(
		() => "parsed",
		(failure: unknown) => (failure instanceof z.ZodError ? "zod refused" : "other"),
	);
	check("an answer of the wrong shape is refused by Zod at the boundary", malformed, "zod refused");

	fake.answerOverride = undefined;
	const refusing: Invoke = () => Promise.reject({ code: "bad-path", detail: "../escape.json" });
	const refused = await new StoreClient(refusing).readDoc(GLOBAL_ROOT, SETTINGS).then(
		() => null,
		(failure: unknown) => (failure instanceof StoreRefusedError ? failure.refusal.code : "other"),
	);
	check("a store refusal arrives as a typed StoreRefusedError", refused, "bad-path");

	const lines: Invoke = () =>
		Promise.resolve({
			lines: [{ id: "a", text: "kept" }, { text: "no id" }],
			cursor: 0,
			hasEarlier: false,
			tornTail: true,
		});
	const page = await quietly(() =>
		new StoreClient(lines).readLines(GLOBAL_ROOT, {
			file: "chat/x.jsonl",
			schema: z.object({ id: z.string(), text: z.string() }),
			before: null,
			limit: 10,
		}),
	);
	check("a line of another shape is skipped, the page keeps its flags", page.answer, {
		lines: [{ id: "a", text: "kept" }],
		cursor: 0,
		hasEarlier: false,
		tornTail: true,
	});
}

function openingOf(fake: FakeStore): { opening: TauriOpening<string>; opened: WorkspaceEntry[] } {
	const opened: WorkspaceEntry[] = [];
	const opening = new TauriOpening<string>({
		store: new StoreClient(fake.invoke),
		workspaces: new WorkspaceClient(fake.invoke),
		openStudio: async (_settings, workspace) => {
			opened.push(workspace);
			return "studio";
		},
	});
	return { opening, opened };
}

function startupReadsIn(infos: readonly string[]): string[] {
	return infos
		.filter((said) => said.startsWith("[ink] startup read"))
		.map((said) => said.split(" ")[3] ?? "")
		.sort();
}

async function firstRunChecks(): Promise<void> {
	const fake = new FakeStore();
	const { opening, opened } = openingOf(fake);
	const { infos } = await quietly(() => opening.start());
	check(
		"a first start opens the Default workspace with no screen",
		[opening.now().kind, opened, fake.commandsCalled().at(-1)],
		["opened", [DEFAULT], "open_first_workspace"],
	);
	check("a first start times its three reads", startupReadsIn(infos), [
		"settings.json",
		"workspace.json",
		"workspaces.json",
	]);
}

async function unopenedChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.refusesFirst = true;
	const { opening, opened } = openingOf(fake);
	await quietly(() => opening.start());
	check("a workspace that cannot be made says why", opening.now(), {
		kind: "unopened",
		failure: "the store refused (io): disk full",
	});

	fake.refusesFirst = false;
	await quietly(() => opening.retry());
	check("trying again opens the studio", [opening.now().kind, opened], ["opened", [DEFAULT]]);
}

async function lastWorkspaceChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.known.set(RESEARCH.id, RESEARCH);
	fake.put("global:workspaces.json", { v: 1, rev: 1, workspaces: [], lastOpenedId: RESEARCH.id });
	const { opening, opened } = openingOf(fake);
	await quietly(() => opening.start());
	check(
		"the last workspace opens by id and keeps its missing folder flagged",
		[opening.now().kind, opened, fake.commandsCalled().at(-1)],
		["opened", [RESEARCH], "mark_workspace_opened"],
	);

	const gone = new FakeStore();
	gone.put("global:workspaces.json", { v: 1, rev: 1, workspaces: [], lastOpenedId: RESEARCH.id });
	const stale = openingOf(gone);
	await quietly(() => stale.opening.start());
	check(
		"a last workspace that is gone falls back to the first one",
		[stale.opening.now().kind, stale.opened],
		["opened", [DEFAULT]],
	);
}

async function workspaceCommandChecks(): Promise<void> {
	const fake = new FakeStore();
	const workspaces = new WorkspaceClient(fake.invoke);
	await workspaces.create("Research");
	await workspaces.attachFolder(RESEARCH.id);
	check(
		"create and attach send only a name and an id, never a path",
		fake.calls.map((call) => call.args),
		[{ name: "Research" }, { id: RESEARCH.id }],
	);
	check("a folder root names the workspace, not the folder", folderRootOf(RESEARCH.id), `folder:${RESEARCH.id}`);
}

await settingsChecks();
await staleRevChecks();
await versionChecks();
await boundaryChecks();
await firstRunChecks();
await unopenedChecks();
await lastWorkspaceChecks();
await workspaceCommandChecks();
await import("./host-tauri-phase2-checks.ts");
await import("./host-tauri-chats-checks.ts");
console.log(tally.failed ? `host-tauri-store: ${tally.failed} check(s) failed` : "host-tauri-store: all checks passed");
process.exit(tally.failed ? 1 : 0);
