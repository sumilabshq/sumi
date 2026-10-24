import { ChatSessions } from "../apps/host-tauri/src/assistant/chat-sessions.ts";
import type { RunAnswer, TurnRun } from "../apps/host-tauri/src/assistant/turn-run.ts";
import { readChatLogs } from "../apps/host-tauri/src/chat/tauri-chat-history.ts";
import { TauriChatsGateway, readChats } from "../apps/host-tauri/src/chat/tauri-chats.ts";
import { StoreClient } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import { TauriWorkspacesGateway } from "../apps/host-tauri/src/workspace/tauri-workspaces.ts";
import { WorkspaceClient } from "../apps/host-tauri/src/workspace/workspace-client.ts";
import { readWorkspaceLooks } from "../apps/host-tauri/src/workspace/workspace-looks.ts";
import { MemoryWorkspacesGateway } from "../packages/domain/workspaces/gateways/workspaces/memory.gateway.ts";
import {
	chatSessionLinkOf,
	workspacesPartsOf,
} from "../packages/domain/workspaces/gateways/workspaces-parts/workspaces-parts.gateway.ts";
import { check, waitFor } from "./check-helpers.ts";
import { DEFAULT, FakeStore, RESEARCH, quietly } from "./host-tauri-fake-store.ts";

interface HeldRun {
	readonly run: TurnRun;
	readonly finish: () => void;
}

function heldRun(): HeldRun {
	const held: { finish: (answer: RunAnswer) => void } = { finish: () => undefined };
	const done = new Promise<RunAnswer>((finish) => {
		held.finish = finish;
	});
	return {
		run: { stop: () => undefined, done },
		finish: () => held.finish({ failure: null }),
	};
}

async function perChatChecks(): Promise<void> {
	const fake = new FakeStore();
	const store = new StoreClient(fake.invoke);
	const [logs, chats] = await Promise.all([readChatLogs(store, DEFAULT.id), readChats(store, DEFAULT.id)]);
	const parts = workspacesPartsOf({
		workspacesGateway: new MemoryWorkspacesGateway({
			workspaces: [{ id: DEFAULT.id, name: DEFAULT.name, icon: null }],
			currentId: DEFAULT.id,
		}),
		chatsGateway: new TauriChatsGateway(chats, logs.legacyChat),
	});
	const runs: HeldRun[] = [];
	const sessions = new ChatSessions(
		{
			...chatSessionLinkOf(parts),
			historyOf: logs.historyOf,
		},
		async () => {
			const held = heldRun();
			runs.push(held);
			return { run: held.run, providerId: "claude-code", resumesWithoutAnId: false };
		},
	);
	const firstId = parts.chatsStore.activeChat().id;
	await quietly(async () => {
		await (await sessions.shownSession()).send("Plan the release");
		await waitFor(() => runs.length === 1);
	});
	check("a first ask names the chat", parts.chatsStore.activeChat().title, "Plan the release");
	check("and marks it running", parts.chatsStore.markOf(firstId), "running");

	const secondId = await quietly(async () => parts.chatsStore.create()).then(({ answer }) => answer);
	await waitFor(() => sessions.now().turns.length === 0);
	check("a new chat shows its own empty conversation", sessions.now().turns.length, 0);
	await quietly(async () => {
		runs[0]?.finish();
		await waitFor(() => parts.chatsStore.markOf(firstId) === "unread");
	});
	check("the first chat finishing while unseen is unread", parts.chatsStore.markOf(firstId), "unread");
	check("the shown chat is untouched by it", sessions.now().turns.length, 0);

	await quietly(async () => parts.chatsStore.select(firstId));
	await waitFor(() => sessions.now().turns.length === 2);
	check(
		"selecting the first chat shows its conversation again and clears unread",
		[sessions.now().turns.map((turn) => turn.role), parts.chatsStore.markOf(firstId)],
		[["user", "agent"], "none"],
	);

	await quietly(() => Promise.all([chats.flush(), logs.sessions.flush()]));
	const keptChats = fake.files.get(`workspace:${DEFAULT.id}:chats.json`)?.["chats"];
	check(
		"chats.json keeps both chats, the untitled one titled null",
		Array.isArray(keptChats) ? keptChats.map((chat: unknown) => Reflect.get(Object(chat), "title")) : null,
		["Plan the release", null],
	);
	check("each chat writes its own log", fake.lines.get(`workspace:${DEFAULT.id}:chat/${firstId}.jsonl`)?.length, 2);
	check("the empty chat writes no log", fake.lines.has(`workspace:${DEFAULT.id}:chat/${secondId}.jsonl`), false);
}

async function workspaceLookChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.known.set(DEFAULT.id, DEFAULT);
	fake.known.set(RESEARCH.id, RESEARCH);
	const store = new StoreClient(fake.invoke);
	const looks = await readWorkspaceLooks(store);
	const gateway = new TauriWorkspacesGateway({
		workspaces: new WorkspaceClient(fake.invoke),
		looks,
		entries: [RESEARCH, DEFAULT],
		currentId: DEFAULT.id,
		reopen: () => Promise.resolve(),
	});
	check(
		"the strip order is the order first seen, oldest opened first, kept from then on",
		gateway.kept().workspaces.map((workspace) => workspace.name),
		["Default", "Research"],
	);
	await gateway.keepIcon(RESEARCH.id, { kind: "emoji", emoji: "🧪" });
	await Promise.all([
		gateway.rename(DEFAULT.id, "Home"),
		gateway.rename(DEFAULT.id, "Home b"),
		gateway.rename(DEFAULT.id, "Home base"),
	]);
	await quietly(() => looks.flush());
	check(
		"an icon is kept in workspace-looks.json by workspace id",
		fake.files.get("global:workspace-looks.json")?.["icons"],
		{ [RESEARCH.id]: { kind: "emoji", emoji: "🧪" } },
	);
	check(
		"a burst of renames writes only the latest name",
		fake.calls.filter((call) => call.command.endsWith("rename_workspace")).map((call) => call.args["name"]),
		["Home base"],
	);
	await gateway.keepIcon(RESEARCH.id, null);
	check("Remove icon drops it", looks.now().icons, {});
}

async function entryOfAnotherShapeChecks(): Promise<void> {
	const fake = new FakeStore();
	const goodChat = {
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
	const filesBefore = JSON.stringify([...fake.files]);
	const store = new StoreClient(fake.invoke);
	const { answer } = await quietly(async () => {
		const [chats, looks, logs] = await Promise.all([
			readChats(store, DEFAULT.id),
			readWorkspaceLooks(store),
			readChatLogs(store, DEFAULT.id),
		]);
		const parts = workspacesPartsOf({
			workspacesGateway: new TauriWorkspacesGateway({
				workspaces: new WorkspaceClient(fake.invoke),
				looks,
				entries: [DEFAULT],
				currentId: DEFAULT.id,
				reopen: () => Promise.resolve(),
			}),
			chatsGateway: new TauriChatsGateway(chats, logs.legacyChat),
		});
		parts.chatsStore.create();
		const iconsRead = Object.keys(looks.now().icons);
		await parts.workspacesGateway.keepIcon(DEFAULT.id, null);
		await Promise.all([chats.flush(), looks.flush(), logs.sessions.flush()]);
		return { parts, looks, logs, iconsRead };
	});
	check(
		"a chat of another shape leaves the other chats in view",
		answer.parts.chatsStore.now().chats.map((chat) => chat.title),
		["Kept", null],
	);
	check(
		"an icon of another shape leaves the others, and the order keeps its good ids",
		[answer.iconsRead, answer.looks.now().order],
		[[DEFAULT.id], [DEFAULT.id]],
	);
	check("a session of another shape leaves the others", Object.keys(answer.logs.sessions.now().sessions), ["good"]);
	check(
		"a doc holding an entry of another shape is never written over",
		[fake.commandsCalled().includes("replace"), JSON.stringify([...fake.files])],
		[false, filesBefore],
	);
}

await perChatChecks();
await workspaceLookChecks();
await entryOfAnotherShapeChecks();
