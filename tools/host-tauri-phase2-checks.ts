import { z } from "zod";
import { TauriPaneTreeGateway } from "../packages/state/layout/gateways/pane-tree/tauri.gateway.ts";
import { boardOf } from "../packages/state/layout/shared/lib/pane-trees.ts";
import { groupedChat } from "../packages/state/layout/shared/lib/chat-groups.ts";
import type { WindowsPanes } from "../packages/state/layout/gateways/pane-tree/tauri.gateway.ts";
import { createTurnSession } from "../apps/host-tauri/src/assistant/turn-session.ts";
import { readChatLogs } from "../apps/host-tauri/src/chat/tauri-chat-history.ts";
import { profileFilesOf } from "../packages/domain/browser/gateways/browser-parts/tauri.gateway.ts";
import {
	KeptGrantsSchema,
	TauriBrowserGrantsGateway,
	keptGrantsKind,
} from "../packages/domain/browser/gateways/browser-grants/tauri.gateway.ts";
import { DEFAULT_BROWSER_PROFILE } from "../packages/domain/browser/shared/lib/browser-profile.ts";
import type { GrantChange, SiteGrant } from "../packages/domain/browser/shared/schema/site-access.schema.ts";
import { HeldDoc } from "../packages/shared/behaviors/src/tauri-store/held-doc.ts";
import {
	GLOBAL_ROOT,
	StoreClient,
	workspaceRootOf,
} from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import type { DocKind } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import { FOLDER_NOT_FOUND, tauriWorkspaceApps } from "../apps/host-tauri/src/workspace/tauri-workspace-apps.ts";
import { WorkspaceClient } from "../apps/host-tauri/src/workspace/workspace-client.ts";
import { reopensOnWorkspaceSwitch } from "../apps/host-tauri/src/workspace/workspace-switch.ts";
import { app } from "../packages/shared/core/src/requests/index.ts";
import { WorkspacesModule } from "../packages/domain/workspaces/module.ts";
import { tauriWorkspacesParts } from "../packages/domain/workspaces/gateways/workspaces-parts/tauri.gateway.ts";
import { check, waitFor } from "./check-helpers.ts";
import type { AssistantTurn } from "../packages/shared/core/src/engine/assistant-port.ts";
import { DEFAULT, FakeStore, RESEARCH, quietly } from "./host-tauri-fake-store.ts";

const WORKSPACE_PANES: DocKind<WindowsPanes> = {
	file: "session.json",
	v: 1,
	schema: z.looseObject({}),
};

const GRANT: SiteGrant = {
	siteKey: "https://example.com",
	scope: "host",
	level: "allowed",
	source: "person",
	grantedAt: 1,
	by: "person",
};

const CHANGE: GrantChange = {
	at: 1,
	siteKey: GRANT.siteKey,
	was: null,
	became: "allowed",
	by: "person",
	reason: "asked",
};

const ASKED: AssistantTurn = {
	role: "user",
	text: "hi",
	calls: [],
};

const ANSWERED: AssistantTurn = {
	role: "agent",
	text: "hello",
	calls: [],
};

async function railChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.known.set(DEFAULT.id, DEFAULT);
	fake.known.set(RESEARCH.id, RESEARCH);
	const reopened: string[] = [];
	const parts = tauriWorkspacesParts(DEFAULT.id, fake.invoke);
	const workspacesApp = app().modules(WorkspacesModule.with(parts)).start();
	reopensOnWorkspaceSwitch(workspacesApp, DEFAULT.id, async () => void reopened.push("reopen"));
	await quietly(() => waitFor(() => parts.workspaces.workspaces().length === 2));
	const apps = tauriWorkspaceApps({ workspaces: new WorkspaceClient(fake.invoke), workspacesApp });
	const listed = await apps.apps();
	check(
		"the rail lists every workspace, a missing folder flagged",
		listed.map((app) => [app.name, app.refusal ?? ""]),
		[
			["Default", ""],
			["Research", FOLDER_NOT_FOUND],
		],
	);

	await quietly(() => apps.openApp(RESEARCH.id));
	check(
		"opening a workspace whose folder is gone asks to locate it, then reopens",
		[fake.commandsCalled().slice(-2), reopened],
		[["mark_workspace_opened", "attach_workspace_folder"], ["reopen"]],
	);
	await quietly(() => apps.createApp());
	check(
		"+ creates a workspace named by the untitled rule and reopens on it",
		[fake.calls.find((call) => call.command.endsWith("create_workspace"))?.args["name"], reopened.length],
		["Untitled 1", 2],
	);
}

function thrownBy(run: () => unknown): string | null {
	try {
		run();
		return null;
	} catch (thrown: unknown) {
		return thrown instanceof Error ? thrown.message : String(thrown);
	}
}

async function ownKeyChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.put(`workspace:${DEFAULT.id}:session.json`, { v: 1, rev: 1 });
	const session = HeldDoc.reading({
		store: new StoreClient(fake.invoke),
		root: workspaceRootOf(DEFAULT.id),
		kind: WORKSPACE_PANES,
		empty: {},
	});
	const written: string[][] = [];
	const change = session.change.bind(session);
	session.change = (patch, reason) => {
		written.push(Object.keys(patch));
		change(patch, reason);
	};
	const first = { root: null, minted: 0, targetId: null } as const;
	const main = new TauriPaneTreeGateway(session, { label: "main", first, boot: null });
	const side = new TauriPaneTreeGateway(session, { label: "studio-2", first, boot: null });
	await waitFor(() => main.isLoaded());
	side.saveTree(
		{
			root: { kind: "pane", id: "pane-tab", view: { kind: "app", tabId: "tab-1" } },
			minted: 3,
			targetId: null,
			shelved: {
				"chat-x": groupedChat({ kind: "pane", id: "pane-x", view: { kind: "chat", chatId: "chat-x" } }, "chat-x"),
			},
		},
		"studio-2 shelves chat-x",
	);
	side.tree();
	written.length = 0;
	main.saveTree(
		{
			root: groupedChat({ kind: "pane", id: "pane-1", view: { kind: "chat", chatId: "chat-x" } }, "chat-x"),
			minted: 1,
			targetId: null,
		},
		"main opens chat-x",
	);
	check("a window writes only its own keys, never another window's", written, [
		["panes", "held:main"],
		["panes:studio-2", "held:studio-2"],
	]);
	check(
		"a chat parked on another window's shelf goes to the window that opened it later, and leaves that shelf",
		[Object.keys(side.tree().shelved ?? {}), boardOf(main.tree()).focusedChatId],
		[[], "chat-x"],
	);
}

async function unreadLayoutChecks(): Promise<void> {
	const fake = new FakeStore();
	const kept = {
		root: { kind: "pane", id: "pane-kept", view: { kind: "chat", chatId: "kept-chat" } },
		minted: 1,
		targetId: null,
	};
	fake.put(`workspace:${DEFAULT.id}:session.json`, { v: 1, rev: 1, panes: kept });
	const session = HeldDoc.reading({
		store: new StoreClient(fake.invoke),
		root: workspaceRootOf(DEFAULT.id),
		kind: WORKSPACE_PANES,
		empty: {},
	});
	const first = {
		root: { kind: "pane", id: "pane-first", view: { kind: "chat" } },
		minted: 0,
		targetId: null,
	} as const;
	const main = new TauriPaneTreeGateway(session, { label: "main", first, boot: null });
	const early = thrownBy(() =>
		main.saveTree(
			{ root: { kind: "pane", id: "pane-new", view: { kind: "chat", chatId: "new-chat" } }, minted: 1, targetId: null },
			"name the first pane",
		),
	);
	await waitFor(() => main.isLoaded());
	check(
		"a layout write before the kept layout is read is refused, and the kept layout survives the read",
		[early !== null, boardOf(main.tree()).focusedChatId],
		[true, "kept-chat"],
	);
	const flaky = new FakeStore();
	flaky.put(`workspace:${DEFAULT.id}:session.json`, { v: 1, rev: 1, panes: kept });
	const reads = { failed: 0 };
	const flakyInvoke: typeof flaky.invoke = async (command, args) => {
		if (command.endsWith("|read") && reads.failed === 0) {
			reads.failed += 1;
			throw new Error("the disk did not answer");
		}

		return flaky.invoke(command, args);
	};
	const retried = HeldDoc.reading({
		store: new StoreClient(flakyInvoke),
		root: workspaceRootOf(DEFAULT.id),
		kind: WORKSPACE_PANES,
		empty: {},
	});
	const afterFailure = new TauriPaneTreeGateway(retried, { label: "main", first, boot: null });
	const isRead = await quietly(() => waitFor(() => afterFailure.isLoaded()));
	check(
		"a first read that fails is tried again, so the board does not stay locked",
		[reads.failed, isRead.answer, boardOf(afterFailure.tree()).focusedChatId],
		[1, true, "kept-chat"],
	);
}

async function tornWindowLayoutChecks(): Promise<void> {
	const fake = new FakeStore();
	const stale = {
		root: { kind: "pane", id: "pane-old", view: { kind: "app", tabId: "tab-10" } },
		minted: 0,
		targetId: "pane-old",
	};
	fake.put(`workspace:${DEFAULT.id}:session.json`, { v: 1, rev: 1, "panes:studio-2": stale });
	const store = new StoreClient(fake.invoke);
	const torn = {
		root: { kind: "pane", id: "pane-torn", view: { kind: "app", tabId: "tab-24" } },
		minted: 0,
		targetId: "pane-torn",
	} as const;
	const panesOf = async (bootTab: string): Promise<string | undefined> => {
		const session = HeldDoc.reading({
			store,
			root: workspaceRootOf(DEFAULT.id),
			kind: WORKSPACE_PANES,
			empty: {},
		});
		await waitFor(() => session.now()["panes:studio-2"] !== undefined);
		const root = new TauriPaneTreeGateway(session, {
			label: "studio-2",
			first: torn,
			boot: { kind: "app", tabId: bootTab },
		}).tree().root;
		return root?.kind === "pane" && root.view.kind === "app" ? (root.view.tabId ?? undefined) : undefined;
	};
	check(
		"a window opened for a torn tab starts from that tab, not from a layout an earlier window of that name left",
		[await panesOf("tab-24"), await panesOf("tab-10")],
		["tab-24", "tab-10"],
	);
	const metSession = HeldDoc.reading({
		store,
		root: workspaceRootOf(DEFAULT.id),
		kind: WORKSPACE_PANES,
		empty: {},
	});
	await waitFor(() => metSession.now()["panes:studio-2"] !== undefined);
	const met = new TauriPaneTreeGateway(metSession, {
		label: "studio-2",
		first: torn,
		boot: { kind: "app", tabId: "tab-10" },
	});
	met.tree();
	met.saveTree(
		{
			root: { kind: "pane", id: "pane-chat", view: { kind: "chat", chatId: "c1" } },
			minted: 1,
			targetId: null,
		},
		"close the boot tab's pane",
	);
	const afterClose = met.tree().root;
	check(
		"once the window stood on its boot tab, closing that tab's pane keeps the rest instead of starting over",
		afterClose?.kind === "split" ? afterClose.chatId : afterClose?.kind,
		"c1",
	);
	const mainWindow = new TauriPaneTreeGateway(metSession, { label: "main", first: torn, boot: null });
	mainWindow.saveTree(
		{
			root: { kind: "pane", id: "pane-1", view: { kind: "app", tabId: "tab-7" } },
			minted: 1,
			targetId: null,
		},
		"main shows tab-7",
	);
	check(
		"each window sees what the others hold, read from the one workspace document",
		[met.elsewhere().map(({ window }) => window), mainWindow.elsewhere().map(({ window }) => window)],
		[["main"], ["studio-2"]],
	);
	met.saveTree(
		{
			root: { kind: "pane", id: "pane-2", view: { kind: "app", tabId: "tab-7" } },
			minted: 2,
			targetId: null,
		},
		"studio-2 takes tab-7",
	);
	check(
		"a tab placed in one window leaves every other window in the same write",
		[mainWindow.tree().root, met.tree().root?.kind === "pane" ? met.tree().root?.id : null],
		[null, "pane-2"],
	);
	mainWindow.saveTree(
		{
			root: { kind: "pane", id: "pane-9", view: { kind: "chat", chatId: "c2" } },
			minted: 9,
			targetId: null,
		},
		"main shows chat c2",
	);
	met.saveTree(
		{
			root: { kind: "pane", id: "pane-3", view: { kind: "chat", chatId: "c3" } },
			minted: 3,
			targetId: null,
		},
		"studio-2 shows chat c3",
	);
	check(
		"each window's chat is read off its own board, so one window picking a chat moves no other",
		[boardOf(mainWindow.tree()).focusedChatId, boardOf(met.tree()).focusedChatId],
		["c2", "c3"],
	);
	await met.forgetOwnWindow("studio-2 closed");
	check("a closed window leaves no layout behind for the others", mainWindow.elsewhere(), []);
}

async function chatChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.put(`workspace:${DEFAULT.id}:chat/index.json`, {
		v: 1,
		rev: 1,
		currentId: "c1",
		resumes: { "claude-code": "s-1" },
	});
	const store = new StoreClient(fake.invoke);
	const logs = await readChatLogs(store, DEFAULT.id);
	check("the chat chat/index.json named is carried over with its session", Object.keys(logs.sessions.now().sessions), [
		"c1",
	]);
	const history = await logs.historyOf("c1");
	check("and keeps its agent session to resume", [...history.kept.resumes], [["claude-code", "s-1"]]);
	history.settled({ ...history.kept.session, turns: [ASKED, ANSWERED] }, new Map([["claude-code", "s-2"]]));
	history.settled({ ...history.kept.session, turns: [ASKED, { ...ANSWERED, text: "hello again" }] }, new Map());
	await quietly(() => logs.sessions.flush());
	check(
		"chat/sessions.json keeps each chat's log and resumes by chat id",
		fake.files.get(`workspace:${DEFAULT.id}:chat/sessions.json`)?.["sessions"],
		{ c1: { logId: "c1", resumes: {} } },
	);

	const reopened = await (await readChatLogs(store, DEFAULT.id)).historyOf("c1");
	const session = createTurnSession(async () => Promise.reject(new Error("no provider")), { history: reopened });
	check(
		"the chat reopens with its history, a rewritten turn read once, newest copy",
		session.now().turns.map((turn) => turn.text),
		["hi", "hello again"],
	);
	check(
		"written to chat/<session>.jsonl, one line per changed turn",
		fake.lines.get(`workspace:${DEFAULT.id}:chat/c1.jsonl`)?.length,
		3,
	);
}

async function profileChecks(): Promise<void> {
	const fake = new FakeStore();
	const store = new StoreClient(fake.invoke);
	const files = profileFilesOf(DEFAULT_BROWSER_PROFILE);
	const grants = await HeldDoc.read({
		store,
		root: GLOBAL_ROOT,
		kind: keptGrantsKind(files),
		empty: KeptGrantsSchema.parse({}),
	});
	new TauriBrowserGrantsGateway(grants, store, files).saveGrants([GRANT], CHANGE);
	await grants.flush();
	check(
		"a grant lands in profiles/<id>/grants.json and its change in grant-changes.jsonl",
		[fake.files.get(`global:${files.grants}`)?.["grants"], fake.lines.get(`global:${files.grantChanges}`)?.length],
		[[GRANT], 1],
	);
}

await railChecks();
await tornWindowLayoutChecks();
await unreadLayoutChecks();
await ownKeyChecks();
await chatChecks();
await profileChecks();
