import { z } from "zod";
import { check, tally } from "./check-helpers.ts";
import { SETTINGS, readSettings } from "../apps/host-tauri/src/settings/settings-doc.ts";

import { TauriOpening } from "../apps/host-tauri/src/startup/tauri-opening.ts";
import {
	GLOBAL_ROOT,
	STORE_CHANGED,
	StoreClient,
	folderRootOf,
} from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import { StoreRefusedError } from "../packages/shared/behaviors/src/tauri-store/store-invoke.ts";
import type { Invoke } from "../packages/shared/behaviors/src/tauri-store/store-invoke.ts";
import { WorkspaceClient } from "../apps/host-tauri/src/workspace/workspace-client.ts";
import type { WorkspaceEntry } from "../apps/host-tauri/src/workspace/workspace-docs.ts";
import { DEFAULT, FakeStore, RESEARCH, quietly } from "./host-tauri-fake-store.ts";

async function settingsChecks(): Promise<void> {
	const fake = new FakeStore();
	const settings = await readSettings(new StoreClient(fake.invoke));
	check("a missing settings.json reads as the defaults", settings.now(), {
		trace: false,
	});

	for (const trace of [true, false, true]) {
		settings.change({ trace }, "trace");
	}
	check("a changed setting reads back at once", settings.now().trace, true);
	await settings.flush();
	check(
		"three quick changes become one replace from rev 0",
		[fake.commandsCalled(), fake.calls[1]?.args["baseRev"], fake.files.get("global:settings.json")],
		[["read", "replace"], 0, { trace: true, v: 1, rev: 1 }],
	);
}

async function staleRevChecks(): Promise<void> {
	const fake = new FakeStore();
	const settings = await readSettings(new StoreClient(fake.invoke));
	fake.put("global:settings.json", { v: 1, rev: 5, chatWidthPx: 320, trace: false });
	settings.change({ trace: true }, "trace");
	await quietly(() => settings.flush());
	check(
		"a stale rev re-reads, keeps the other writer's field and writes on top",
		[fake.commandsCalled(), fake.files.get("global:settings.json")],
		[["read", "replace", "read", "replace"], { trace: true, v: 1, rev: 6, chatWidthPx: 320 }],
	);
}

async function versionChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.put("global:settings.json", { v: 2, rev: 3, trace: false });
	const store = new StoreClient(fake.invoke);
	const read = await store.readDoc(GLOBAL_ROOT, SETTINGS);
	const settings = await readSettings(store);
	settings.change({ trace: true }, "trace");
	await quietly(() => settings.flush());
	check(
		"a newer v is read-only: read, never replaced",
		[read.isReadOnly, fake.commandsCalled(), fake.files.get("global:settings.json")?.["trace"]],
		[true, ["read", "read"], false],
	);
}

interface HeardStore {
	readonly fake: FakeStore;
	readonly store: StoreClient;
	readonly asked: string[];
	readonly announce: (change: unknown) => Promise<void>;
}

function heardStore(): HeardStore {
	const fake = new FakeStore();
	const asked: string[] = [];
	const hearers: ((payload: unknown) => void)[] = [];
	const store = new StoreClient(fake.invoke, {
		listen: (event, heard) => {
			asked.push(event);
			hearers.push(heard);
		},
		ownLabel: "main",
	});
	const announce = async (change: unknown): Promise<void> => {
		for (const heard of hearers) {
			heard(change);
		}

		await new Promise((settled) => setTimeout(settled, 0));
	};
	return { fake, store, asked, announce };
}

async function foreignWriteChecks(): Promise<void> {
	const { fake, store, asked, announce } = heardStore();
	const settings = await readSettings(store);
	let notified = 0;
	settings.watch(() => {
		notified += 1;
	});
	check("the client listens for store changes", asked, [STORE_CHANGED]);

	fake.put("global:settings.json", { v: 1, rev: 3, trace: true });
	await quietly(() => announce({ root: "global", file: "settings.json", rev: 3, by: "studio-2" }));
	check(
		"another window's newer rev re-reads and notifies",
		[settings.now().trace, notified, fake.commandsCalled()],
		[true, 1, ["read", "read"]],
	);

	fake.put("global:settings.json", { v: 1, rev: 4, trace: false });
	await announce({ root: "global", file: "settings.json", rev: 4, by: "main" });
	await announce({ root: "global", file: "settings.json", rev: 3, by: "studio-2" });
	await announce({ root: "global", file: "other.json", rev: 9, by: "studio-2" });
	await announce({ root: "global", file: "log.jsonl", rev: null, by: "studio-2" });
	check(
		"this window's own write, an old rev, a doc not held and a line do nothing",
		[settings.now().trace, notified, fake.commandsCalled()],
		[true, 1, ["read", "read"]],
	);
}

async function foreignWriteKeepsPendingChecks(): Promise<void> {
	const { fake, store, announce } = heardStore();
	const settings = await readSettings(store);
	settings.change({ trace: true }, "trace");
	fake.put("global:settings.json", { v: 1, rev: 2, trace: false, chatWidthPx: 320 });
	await quietly(() => announce({ root: "global", file: "settings.json", rev: 2, by: "studio-2" }));
	await settings.flush();
	check(
		"a re-read keeps the change not yet written and writes it on the new rev",
		[fake.commandsCalled(), fake.calls[2]?.args["baseRev"], fake.files.get("global:settings.json")],
		[["read", "read", "replace"], 2, { trace: true, v: 1, rev: 3, chatWidthPx: 320 }],
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
await foreignWriteChecks();
await foreignWriteKeepsPendingChecks();
await boundaryChecks();
await firstRunChecks();
await unopenedChecks();
await lastWorkspaceChecks();
await workspaceCommandChecks();
await import("./host-tauri-phase2-checks.ts");
await import("./host-tauri-chats-checks.ts");
console.log(tally.failed ? `host-tauri-store: ${tally.failed} check(s) failed` : "host-tauri-store: all checks passed");
process.exit(tally.failed ? 1 : 0);
