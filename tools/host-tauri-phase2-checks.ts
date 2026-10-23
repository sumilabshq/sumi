import { studioAppHostParts } from "../packages/app-host/gateways/app-host-parts/studio.gateway.ts";
import { HostTabs } from "../packages/app-host/shared/lib/host-tabs/host-tabs.ts";
import { createStudioState } from "../apps/studio/src/legacy/studio-state.ts";
import { createTurnSession } from "../packages/host-tauri/src/assistant/turn-session.ts";
import { readChatHistory } from "../packages/host-tauri/src/chat/tauri-chat-history.ts";
import { DEFAULT_PROFILE, profileFilesOf, readProfile } from "../packages/host-tauri/src/profile/profile-docs.ts";
import { tauriProfileGateways } from "../packages/host-tauri/src/profile/tauri-profile-gateways.ts";
import { TauriTabsSessionGateway, readSession } from "../packages/host-tauri/src/session/tauri-session.ts";
import { StoreClient } from "../packages/host-tauri/src/store/store-client.ts";
import { FOLDER_NOT_FOUND, tauriWorkspaceApps } from "../packages/host-tauri/src/workspace/tauri-workspace-apps.ts";
import { WorkspaceClient } from "../packages/host-tauri/src/workspace/workspace-client.ts";
import type { GrantChange, SiteGrant } from "../packages/browser/generated/index.ts";
import type { AssistantTurn } from "../packages/core/src/engine/assistant-port.ts";
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
		"+ creates a workspace and reopens on it",
		[fake.commandsCalled().at(-1), reopened.length],
		["create_workspace", 2],
	);
}

async function tabsSessionChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.put(`workspace:${DEFAULT.id}:session.json`, { v: 1, rev: 1 });
	const store = new StoreClient(fake.invoke);
	const session = await readSession(store, DEFAULT.id);
	const kept = { tabsSessionGateway: new TauriTabsSessionGateway(session) };
	const parts = studioAppHostParts({ studioState: createStudioState(), workspace: DEFAULT.id, ...kept });
	const browserTab = parts.hostTabs.now().tabs.find((tab) => tab.app === "browser");
	const opened = parts.hostTabs.openAfter(browserTab?.id ?? "", { app: "browser", pageId: "page-9" });
	parts.hostTabs.show(opened.id);
	await session.flush();

	const reopened = await readSession(store, DEFAULT.id);
	const restored = new HostTabs([], new TauriTabsSessionGateway(reopened).kept());
	check(
		"session.json brings the tabs back with the shown one, dead page ids dropped",
		[restored.now().tabs.map((tab) => [tab.app, tab.pageId]), restored.now().shownId === opened.id],
		[
			[
				["canvas", null],
				["browser", null],
				["browser", null],
			],
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
	const history = await readChatHistory(store, DEFAULT.id);
	history.settled({ ...history.kept.session, turns: [ASKED, ANSWERED] }, new Map([["claude-code", "s-2"]]));
	history.settled({ ...history.kept.session, turns: [ASKED, { ...ANSWERED, text: "hello again" }] }, new Map());
	await quietly(() => history.index.flush());

	const reopened = await readChatHistory(store, DEFAULT.id);
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
