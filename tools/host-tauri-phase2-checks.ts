import {
	KeptTabsDocSchema,
	TauriHostTabsGateway,
} from "../packages/domain/app-host/gateways/host-tabs/tauri.gateway.ts";
import type { KeptTabsDoc } from "../packages/domain/app-host/gateways/host-tabs/tauri.gateway.ts";
import {
	CreateGroupCommand,
	OpenTabCommand,
	RestoreTabsCommand,
	ShowTabCommand,
} from "../packages/domain/app-host/generated/contract.ts";
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
import { studioFakesOf } from "./app-host-fixture.ts";

const SESSION_TABS: DocKind<KeptTabsDoc> = {
	file: "session.json",
	v: 1,
	schema: KeptTabsDocSchema,
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

async function tabsSessionChecks(): Promise<void> {
	const fake = new FakeStore();
	fake.put(`workspace:${DEFAULT.id}:session.json`, { v: 1, rev: 1 });
	const store = new StoreClient(fake.invoke);
	const sessionTabs = (): TauriHostTabsGateway =>
		new TauriHostTabsGateway(
			HeldDoc.read({
				store,
				root: workspaceRootOf(DEFAULT.id),
				kind: SESSION_TABS,
				empty: KeptTabsDocSchema.parse({}),
			}),
		);
	const { studioApp } = studioFakesOf({ hostTabs: sessionTabs(), view: "canvas" });
	await studioApp.send(RestoreTabsCommand);
	await studioApp.send(OpenTabCommand, { app: "browser" });
	await studioApp.send(OpenTabCommand, { app: "browser" });
	await studioApp.send(CreateGroupCommand, { withTabId: "tab-2" });
	await studioApp.send(ShowTabCommand, { id: "tab-3" });
	const keptTabsOnDisk = (): unknown => fake.files.get(`workspace:${DEFAULT.id}:session.json`)?.["tabs"];
	await waitFor(() => JSON.stringify(keptTabsOnDisk() ?? null).includes('"shownId":"tab-3"'));

	const reopened = sessionTabs();
	await reopened.tabsLoaded();
	const kept = reopened.tabs();
	check(
		"session.json brings the tabs, their groups and the shown one back",
		[
			kept?.tabs.map((tab) => [tab.app, tab.pageId !== null, tab.essentialId === null]),
			kept?.groups.map((group) => [group.name, group.tabIds]),
			kept?.shownId,
		],
		[
			[
				["canvas", false, false],
				["browser", true, true],
				["browser", true, true],
			],
			[["New group", ["tab-2"]]],
			"tab-3",
		],
	);
	const restarted = studioFakesOf({ hostTabs: reopened, view: "browser", isBrowserAvailable: false });
	await restarted.studioApp.send(RestoreTabsCommand);
	check(
		"a restart drops the dead page ids the last start gave",
		reopened.tabs()?.tabs.map((tab) => tab.pageId),
		[null, null, null],
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
await tabsSessionChecks();
await chatChecks();
await profileChecks();
