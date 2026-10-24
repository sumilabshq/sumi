import { studioAppHostParts } from "../packages/domain/app-host/gateways/app-host-parts/studio.gateway.ts";
import { HostTabs } from "../packages/domain/app-host/shared/lib/host-tabs/host-tabs.ts";
import { createStudioState } from "../apps/studio/src/legacy/studio-state.ts";
import { createTurnSession } from "../apps/host-tauri/src/assistant/turn-session.ts";
import { readChatLogs } from "../apps/host-tauri/src/chat/tauri-chat-history.ts";
import { DEFAULT_PROFILE, profileFilesOf, readProfile } from "../apps/host-tauri/src/profile/profile-docs.ts";
import { tauriProfileGateways } from "../apps/host-tauri/src/profile/tauri-profile-gateways.ts";
import { TauriTabsSessionGateway, readSession } from "../apps/host-tauri/src/session/tauri-session.ts";
import { StoreClient } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import { FOLDER_NOT_FOUND, tauriWorkspaceApps } from "../apps/host-tauri/src/workspace/tauri-workspace-apps.ts";
import { WorkspaceClient } from "../apps/host-tauri/src/workspace/workspace-client.ts";
import type { GrantChange, SiteGrant } from "../packages/domain/browser/generated/index.ts";
import type { AssistantTurn } from "../packages/shared/core/src/engine/assistant-port.ts";
import { check } from "./check-helpers.ts";
import { DEFAULT, FakeStore, RESEARCH, quietly } from "./host-tauri-fake-store.ts";

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
	const apps = tauriWorkspaceApps({
		workspaces: new WorkspaceClient(fake.invoke),
		reopen: async () => void reopened.push("reopen"),
		nextName: () => "Untitled 1",
	});
	const listed = await apps.apps();
	check(
		"the rail lists every workspace, a missing folder flagged",
		listed.map((app) => [app.name, app.refusal ?? ""]),
		[
			["Default", ""],
			["Research", FOLDER_NOT_FOUND],
		],
	);

	await apps.openApp(RESEARCH.id);
	check(
		"opening a workspace whose folder is gone asks to locate it, then reopens",
		[fake.commandsCalled().slice(-2), reopened],
		[["mark_workspace_opened", "attach_workspace_folder"], ["reopen"]],
	);
	await apps.createApp();
	check(
		"+ creates a workspace named by the untitled rule and reopens on it",
		[fake.commandsCalled().at(-1), fake.calls.at(-1)?.args["name"], reopened.length],
		["create_workspace", "Untitled 1", 2],
	);
}

async function tabsSessionChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.put(`workspace:${DEFAULT.id}:session.json`, { v: 1, rev: 1 });
	const store = new StoreClient(fake.invoke);
	const session = await readSession(store, DEFAULT.id);
	const kept = { tabsSessionGateway: new TauriTabsSessionGateway(session) };
	const parts = studioAppHostParts({ studioState: createStudioState(), workspace: DEFAULT.id, ...kept });
	const chatId = "chat-1";
	const first = parts.hostTabs.open({ app: "browser", pageId: "page-8" }, { chatId, groupId: null, before: null });
	const opened = parts.hostTabs.openAfter(first.id, { app: "browser", pageId: "page-9" });
	parts.hostTabs.newGroup(chatId, first.id);
	parts.hostTabs.show(opened.id);
	await session.flush();

	const reopened = await readSession(store, DEFAULT.id);
	const restored = new HostTabs(new TauriTabsSessionGateway(reopened).kept(), chatId);
	check(
		"session.json brings the tabs, their groups and the shown one back, dead page ids dropped",
		[
			restored.now().tabs.map((tab) => [tab.app, tab.pageId, tab.essentialId === null]),
			restored.now().groups.map((group) => [group.name, group.tabIds]),
			restored.now().shownId === opened.id,
		],
		[
			[
				["canvas", null, false],
				["browser", null, true],
				["browser", null, true],
			],
			[["New group", [first.id]]],
			true,
		],
	);
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
	check("the chat chat/index.json named is carried over as a chat of its own", logs.legacyChat, { id: "c1" });
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
	const session = createTurnSession(async () => Promise.reject(new Error("no provider")), Date.now, reopened);
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
	const profile = await readProfile(store, DEFAULT_PROFILE);
	const gateways = tauriProfileGateways(profile);
	gateways.browserGrantsGateway.writeGrantChange([GRANT], CHANGE);
	await profile.grants.flush();
	const files = profileFilesOf(DEFAULT_PROFILE);
	check(
		"a grant lands in profiles/<id>/grants.json and its change in grant-changes.jsonl",
		[fake.files.get(`global:${files.grants}`)?.["grants"], fake.lines.get(`global:${files.grantChanges}`)?.length],
		[[GRANT], 1],
	);
}

await railChecks();
await tabsSessionChecks();
await chatChecks();
await profileChecks();
