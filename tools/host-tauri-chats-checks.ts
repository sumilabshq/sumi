import { ChatSessions } from "../apps/tauri/src/assistant/chat-sessions.ts";
import { chatSessionLinkOf } from "../apps/tauri/src/assistant/chat-session-link.ts";
import type { RunAnswer, TurnRun } from "../apps/tauri/src/assistant/turn-run.ts";
import { readChatLogs } from "../apps/tauri/src/chat/tauri-chat-history.ts";
import { focusedChatPortOf } from "../apps/studio/src/chats-column/focused-chat.ts";
import { LayoutModule } from "../packages/state/layout/module.ts";
import { partsOf } from "./layout-rules-checks.ts";
import { ShowChatInPaneCommand } from "../packages/state/layout/generated/contract.ts";
import { StoreClient } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import { app } from "../packages/shared/data-framework/src/index.ts";
import type { StartedApp } from "../packages/shared/data-framework/src/index.ts";
import {
	ChatRecordsQuery,
	CreateChatCommand,
	SetWorkspaceIconCommand,
	WorkspacesQuery,
} from "../packages/domain/workspaces/generated/contract.ts";
import { WorkspacesModule } from "../packages/domain/workspaces/module.ts";
import { tauriWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/tauri.gateway.ts";
import type { WorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/workspaces-parts.gateway.ts";
import { check, waitFor } from "./check-helpers.ts";
import { DEFAULT, FakeStore, RESEARCH, quietly } from "./host-tauri-fake-store.ts";
import type { Doc } from "./host-tauri-fake-store.ts";
import { placesOver } from "./places-fixture.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { MarkTabSeenCommand } from "../packages/state/places/generated/contract.ts";

interface HeldRun {
	readonly run: TurnRun;
	readonly finish: () => void;
}

interface TauriWorkspaces {
	readonly parts: WorkspacesParts;
	readonly started: StartedApp;
	readonly marks: Map<string, string>;
}

function heldRun(): HeldRun {
	const held: { finish: (answer: RunAnswer) => void } = { finish: () => undefined };
	const done = new Promise<RunAnswer>((finish) => {
		held.finish = finish;
	});
	return {
		run: { stop: () => undefined, done },
		finish: () => held.finish({ failure: null, failureKind: null, resumesAt: null }),
	};
}

function tauriWorkspacesOf(fake: FakeStore): TauriWorkspaces {
	const parts = tauriWorkspacesParts(DEFAULT.id, fake.invoke);
	const tabs = new MemoryTabsGateway();
	const marks = new Map<string, string>();
	tabs.placedTabsChanged(() => {
		void tabs.placedTabs().then((placed) => placed.tabs.forEach((tab) => marks.set(tab.id, tab.mark)));
	});
	return {
		parts,
		marks,
		started: app()
			.modules(LayoutModule.with({ ...partsOf() }), WorkspacesModule.with(parts))
			.imports(placesOver(tabs))
			.start(),
	};
}

async function firstChatIdIn({ started }: TauriWorkspaces): Promise<string | undefined> {
	await waitFor(() => started.routes.readNow(ChatRecordsQuery) !== null);
	const answer = await started.send(ChatRecordsQuery);
	return answer.ok ? [...answer.output.chats].sort((one, other) => other.lastAt - one.lastAt)[0]?.id : undefined;
}

function markOf({ marks }: TauriWorkspaces, id: string): string {
	return marks.get(id) ?? "none";
}

function keptChatsIn(fake: FakeStore): unknown[] | null {
	const kept: unknown = fake.files.get(`workspace:${DEFAULT.id}:chats.json`)?.["chats"];
	return Array.isArray(kept) ? kept : null;
}

function titlesIn(chats: readonly unknown[] | null): unknown[] | null {
	return chats === null ? null : chats.map((chat: unknown) => Reflect.get(Object(chat), "title"));
}

async function perChatChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.known.set(DEFAULT.id, DEFAULT);
	const logs = await readChatLogs(new StoreClient(fake.invoke), DEFAULT.id);
	const workspaces = tauriWorkspacesOf(fake);
	const focusedChat = focusedChatPortOf(workspaces.started);
	const runs: HeldRun[] = [];
	const sessions = new ChatSessions(
		{
			...chatSessionLinkOf(workspaces.started),
			historyOf: logs.historyOf,
		},
		async () => {
			const held = heldRun();
			runs.push(held);
			return { run: held.run, providerId: "claude-code", resumesWithoutAnId: false };
		},
	);
	const firstId = (await firstChatIdIn(workspaces)) ?? "";
	await quietly(() => workspaces.started.send(ShowChatInPaneCommand, { chatId: firstId, paneId: null }));
	await waitFor(() => focusedChat.now()?.id === firstId);
	await quietly(async () => {
		await (await sessions.shownSession()).send("Plan the release");
		await waitFor(() => runs.length === 1 && markOf(workspaces, firstId) === "running");
	});
	check("a first ask names the chat", focusedChat.now()?.title, "Plan the release");
	check("and marks it running", markOf(workspaces, firstId), "running");

	const made = await quietly(() => workspaces.started.send(CreateChatCommand, { title: null }));
	const secondId = made.answer.ok ? made.answer.output.id : "";
	await quietly(() => workspaces.started.send(ShowChatInPaneCommand, { chatId: secondId, paneId: null }));
	check("a new chat shown in the chat pane is the focused one", focusedChat.now()?.id, secondId);
	await waitFor(() => sessions.now().turns.length === 0);
	check("a new chat shows its own empty conversation", sessions.now().turns.length, 0);
	await quietly(async () => {
		runs[0]?.finish();
		await waitFor(() => markOf(workspaces, firstId) === "unread");
	});
	check("the first chat finishing while unseen is unread", markOf(workspaces, firstId), "unread");
	check("the shown chat is untouched by it", sessions.now().turns.length, 0);

	await quietly(async () => {
		await workspaces.started.send(ShowChatInPaneCommand, { chatId: firstId, paneId: null });
		await workspaces.started.send(MarkTabSeenCommand, { id: firstId });
	});
	await waitFor(() => sessions.now().turns.length === 2);
	check(
		"selecting the first chat shows its conversation again and clears unread",
		[sessions.now().turns.map((turn) => turn.role), markOf(workspaces, firstId)],
		[["user", "agent"], "none"],
	);

	await quietly(async () => {
		await logs.sessions.flush();
		await waitFor(
			() => keptChatsIn(fake)?.length === 2 && fake.lines.has(`workspace:${DEFAULT.id}:chat/${firstId}.jsonl`),
		);
	});
	check("chats.json keeps both chats, the untitled one titled null", titlesIn(keptChatsIn(fake)), [
		"Plan the release",
		null,
	]);
	check("each chat writes its own log", fake.lines.get(`workspace:${DEFAULT.id}:chat/${firstId}.jsonl`)?.length, 2);
	check("the empty chat writes no log", fake.lines.has(`workspace:${DEFAULT.id}:chat/${secondId}.jsonl`), false);
}

async function legacyChatChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.put(`workspace:${DEFAULT.id}:chat/index.json`, {
		v: 1,
		rev: 1,
		currentId: "c1",
		resumes: {},
	});
	const workspaces = tauriWorkspacesOf(fake);
	await waitFor(() => workspaces.parts.chats.chats().chats.some((chat) => chat.id === "c1"));
	check(
		"the chat chat/index.json named is carried over as a chat of its own, opened on start",
		[workspaces.parts.chats.chats().chats.map((chat) => chat.id), workspaces.parts.chats.chats().openOnStartId],
		[["c1"], "c1"],
	);
}

function rowsIn({ started }: TauriWorkspaces): readonly { readonly id: string; readonly name: string }[] {
	const read = started.routes.readNow(WorkspacesQuery);
	return read === null ? [] : WorkspacesQuery.outputSchema.parse(read.output).rows;
}

function iconsIn(fake: FakeStore): unknown {
	return fake.files.get("global:workspace-looks.json")?.["icons"];
}

async function workspaceLookChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.known.set(DEFAULT.id, DEFAULT);
	fake.known.set(RESEARCH.id, RESEARCH);
	const workspaces = tauriWorkspacesOf(fake);
	await quietly(() => waitFor(() => rowsIn(workspaces).length === 2));
	check(
		"the strip order is the order first seen, oldest opened first, kept from then on",
		rowsIn(workspaces).map((workspace) => workspace.name),
		["Default", "Research"],
	);
	await quietly(() =>
		workspaces.started.send(SetWorkspaceIconCommand, { id: RESEARCH.id, icon: { kind: "emoji", emoji: "🧪" } }),
	);
	await quietly(() =>
		Promise.all([
			workspaces.parts.workspaces.saveWorkspaceName(DEFAULT.id, "Home", "rename"),
			workspaces.parts.workspaces.saveWorkspaceName(DEFAULT.id, "Home b", "rename"),
			workspaces.parts.workspaces.saveWorkspaceName(DEFAULT.id, "Home base", "rename"),
		]),
	);
	check("an icon is kept in workspace-looks.json by workspace id", iconsIn(fake), {
		[RESEARCH.id]: { kind: "emoji", emoji: "🧪" },
	});
	check(
		"a burst of renames writes only the latest name",
		fake.calls.filter((call) => call.command.endsWith("rename_workspace")).map((call) => call.args["name"]),
		["Home base"],
	);
	await quietly(() => workspaces.started.send(SetWorkspaceIconCommand, { id: RESEARCH.id, icon: null }));
	check("Remove icon drops it", iconsIn(fake), {});
}

function anotherShapeFiles(fake: FakeStore): void {
	const goodChat: Doc = {
		id: "good",
		title: "Kept",
		isPinned: false,
		createdAt: 1,
		lastAt: 2,
	};
	fake.put(`workspace:${DEFAULT.id}:chats.json`, {
		v: 1,
		rev: 3,
		chats: [goodChat, { id: "", title: 5 }],
		activeId: "good",
	});
	fake.put("global:workspace-looks.json", {
		v: 1,
		rev: 2,
		order: [DEFAULT.id, 7],
		icons: {
			[DEFAULT.id]: { kind: "emoji", emoji: "🧪" },
			broken: { kind: "nope" },
		},
	});
	fake.put(`workspace:${DEFAULT.id}:chat/sessions.json`, {
		v: 1,
		rev: 1,
		sessions: {
			good: { logId: "good", resumes: {} },
			bad: { logId: "" },
		},
	});
}

async function entryOfAnotherShapeChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.known.set(DEFAULT.id, DEFAULT);
	anotherShapeFiles(fake);
	const filesBefore = JSON.stringify([...fake.files]);
	const { answer } = await quietly(async () => {
		const logs = await readChatLogs(new StoreClient(fake.invoke), DEFAULT.id);
		const workspaces = tauriWorkspacesOf(fake);
		await waitFor(
			() => rowsIn(workspaces).length === 1 && workspaces.parts.chats.chats().chats.some((chat) => chat.id === "good"),
		);
		await workspaces.started.send(CreateChatCommand, { title: null });
		const read = workspaces.started.routes.readNow(WorkspacesQuery);
		const rows = read === null ? [] : WorkspacesQuery.outputSchema.parse(read.output).rows;
		await workspaces.started.send(SetWorkspaceIconCommand, { id: DEFAULT.id, icon: null });
		await logs.sessions.flush();
		return { workspaces, logs, rows };
	});
	check(
		"a chat of another shape leaves the other chats in view",
		answer.workspaces.parts.chats.chats().chats.map((chat) => chat.title),
		["Kept", null],
	);
	check(
		"an icon of another shape leaves the others, and the order keeps its good ids",
		answer.rows.map((row) => [row.id, row.icon]),
		[[DEFAULT.id, { kind: "emoji", emoji: "🧪" }]],
	);
	check("a session of another shape leaves the others", Object.keys(answer.logs.sessions.now().sessions), ["good"]);
	check(
		"a doc holding an entry of another shape is never written over",
		[fake.commandsCalled().includes("replace"), JSON.stringify([...fake.files])],
		[false, filesBefore],
	);
}

await perChatChecks();
await legacyChatChecks();
await workspaceLookChecks();
await entryOfAnotherShapeChecks();
