import { placesWindowOf } from "@widgetarium/behaviors";
import { tabGroups } from "../plugins/tabs/tab-groups/data/tab-groups/generated/contract.ts";
import { tabGroups as RunnableTabGroupsModule } from "../plugins/tabs/tab-groups/data/tab-groups/generated/module.ts";
import { BARE_SCREEN } from "./places-fixture.ts";
import { BUILT_IN_PLACED_APPS, builtInPlacedApps } from "./placed-apps-fixture.ts";
import { ListedPlacedAppsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/placed-apps/listed.gateway.ts";
import { placedAppOf } from "../plugins/apps/src/features/app-tab/lib/placed-app-of.ts";
import { runtime, localTransport } from "../packages/shared/data-framework/src/index.ts";
import type { RemoteTransport, Runtime } from "../packages/shared/data-framework/src/index.ts";
import { HeldDoc } from "../packages/shared/behaviors/src/tauri-store/held-doc.ts";
import { StoreClient, workspaceRootOf } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import type { DocKind } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import { navigation } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import type { TabsAsk } from "../plugins/tabs/navigation/data/navigation/generated/contract.ts";
import { navigation as RunnablePlacesModule } from "../plugins/tabs/navigation/data/navigation/generated/module.ts";
import { MemoryTabsGateway } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/memory.gateway.ts";
import {
	KeptNavigationSchema,
	TauriTabsGateway,
} from "../plugins/tabs/navigation/data/navigation/gateways/tabs/tauri/tauri.gateway.ts";
import type { KeptNavigation } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/tauri/tauri.gateway.ts";
import { workspaceTabsOf } from "../plugins/tabs/navigation/data/navigation/gateways/tabs/tauri/legacy-tabs.ts";
import { PlacedTabsSchema } from "../plugins/tabs/navigation/data/navigation/shared/schema/tabs.schema.ts";
import { tabBreaksOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-invariants.ts";
import { momentOfWindow } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/kept-tabs.ts";
import { BUILT_IN_APPS } from "./placed-apps-fixture.ts";
import { DEFAULT, FakeStore } from "./host-tauri-fake-store.ts";
import { check, tally, waitFor } from "./check-helpers.ts";
import { chatFacts } from "../plugins/ai/chat/data/chat-facts/generated/contract.ts";
import { chatFacts as chatFactsModule } from "../plugins/ai/chat/data/chat-facts/generated/module.ts";

const NAVIGATION: DocKind<KeptNavigation> = {
	file: "navigation.json",
	v: 1,
	schema: KeptNavigationSchema,
};

function askAt(window: string): TabsAsk {
	return { window, screen: BARE_SCREEN };
}

function windowsOver(tabs: MemoryTabsGateway | TauriTabsGateway): readonly [Runtime, Runtime] {
	const core = localTransport();
	core.serve(placesCoreOver(tabs));
	return [windowOver(core), windowOver(core)];
}

function placesCoreOver(tabs: MemoryTabsGateway | TauriTabsGateway): Runtime {
	const parts = {
		tabs,
		placedApps: builtInPlacedApps(),
	};
	return runtime()
		.modules(
			RunnablePlacesModule({ injects: parts }),
			RunnableTabGroupsModule({ injects: parts }),
			chatFactsModule({ injects: parts }),
		)
		.start({ platform: "server", env: {} });
}

function windowOver(core: RemoteTransport): Runtime {
	return runtime()
		.imports(navigation({ over: core }), tabGroups({ over: core }), chatFacts({ over: core }))
		.start();
}

async function listsIn(windowApp: Runtime, window: string): Promise<unknown> {
	const placed = await windowApp.send(navigation.tabs.placedTabs, { window });
	return placed.ok ? [placed.output.lists, placed.output.shownId] : placed.reason;
}

async function unreadableChecks(): Promise<void> {
	const fake = new FakeStore();
	const root = workspaceRootOf(DEFAULT.id);
	fake.put(`${root}:session.json`, { v: 1, rev: 1, tabs: { tabs: [], shownId: null, minted: 4, closed: [] } });
	fake.put(`${root}:navigation.json`, { v: 1, rev: 1, tabs: { broken: true } });
	const store = new StoreClient(fake.invoke);
	const kept = HeldDoc.read({ store, root, kind: NAVIGATION, empty: KeptNavigationSchema.parse({}) });
	const [main] = windowsOver(new TauriTabsGateway(kept));
	const placed = await main.send(navigation.tabs.placedTabs, { window: "main" });
	check(
		"unreadable tabs start empty and are kept aside, never read again from the older files",
		[placed.ok ? placed.output.minted : placed.reason, fake.files.get(`${root}:navigation.json`)?.["unreadableTabs"]],
		[0, { broken: true }],
	);
}

async function oneWriterChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const [main, side] = windowsOver(tabs);
	const opened = await Promise.all([
		main.send(navigation.tabOpening.openTab, { at: askAt("main"), app: "canvas" }),
		side.send(navigation.tabOpening.openTab, { at: askAt("studio-2"), app: "canvas" }),
	]);
	check(
		"two windows opening a tab at once each get their own, minted by the one writer",
		opened.map((answer) => (answer.ok ? answer.output.id : answer.reason)),
		["tab-1", "tab-2"],
	);

	const [mainView, sideView] = await Promise.all([listsIn(main, "main"), listsIn(side, "studio-2")]);
	const both = {
		workspace: [
			{ kind: "tab", id: "tab-1" },
			{ kind: "tab", id: "tab-2" },
		],
	};
	check(
		"every window sees the one list of the workspace, and shows the tab it opened",
		[Array.isArray(mainView) ? mainView : [], Array.isArray(sideView) ? sideView : []],
		[
			[both, "tab-1"],
			[both, "tab-2"],
		],
	);

	const heard = { count: 0 };
	main.routes.watch(navigation.tabs.placedTabs, { window: "main" }, () => {
		heard.count += 1;
	});
	await side.send(navigation.tabOpening.openTab, { at: askAt("studio-2"), app: "canvas" });
	check("and the other window hears the change without asking", await waitFor(() => heard.count > 0), true);
}

async function declaredRuleChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const [main] = windowsOver(tabs);
	const canvas = await main.send(navigation.tabOpening.openTab, { at: askAt("main"), app: "canvas" });
	const below = await main.send(navigation.tabOpening.openBelow, {
		at: askAt("main"),
		id: canvas.ok ? canvas.output.id : "",
	});
	const placed = await main.send(navigation.tabs.placedTabs, { window: "main" });
	const belowApp = placed.ok && below.ok ? placed.output.tabs.find(({ id }) => id === below.output.id)?.app : null;
	check("a tab opened below opens the app that declares it navigates", belowApp, "browser");
	const chat = await main.send(navigation.tabOpening.openTab, { at: askAt("main"), app: "chat" });
	check(
		"opening a tab of the app that declares it draws no page is refused",
		chat.ok ? "opened" : chat.reason,
		"a tab of chat cannot be opened: chat draws no page in a tab",
	);
}

async function lawChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const [main] = windowsOver(tabs);
	await main.send(chatFacts.turns.keepChatTabs, {
		chats: [
			{ id: "chat-a", title: null },
			{ id: "chat-b", title: null },
		],
	});
	await main.send(chatFacts.turns.keepChatTabs, {
		chats: [
			{ id: "chat-a", title: null },
			{ id: "chat-b", title: null },
		],
	});
	const tab = await main.send(navigation.tabOpening.openTab, { at: askAt("main"), app: "canvas" });
	const tabId = tab.ok ? tab.output.id : "";
	const chatInChat = await main.send(navigation.tabPlacing.place, {
		at: askAt("main"),
		id: "chat-b",
		place: { list: "chat-a", groupId: null, before: null },
	});
	const noChat = await main.send(navigation.tabPlacing.place, {
		at: askAt("main"),
		id: tabId,
		place: { list: "tab-1", groupId: null, before: null },
	});
	check(
		"a chat is kept once, and no tab, a chat included, holds a list",
		[
			(await tabs.placedTabs()).tabs.filter((one) => one.app === "chat").length,
			chatInChat.ok ? "placed" : chatInChat.reason,
			noChat.ok ? "placed" : noChat.reason,
		],
		[
			2,
			'the tab "chat-b" cannot stand inside "chat-a": a tab stands only in the list of the workspace',
			'the tab "tab-1" cannot stand inside "tab-1": a tab stands only in the list of the workspace',
		],
	);

	const grouped = await main.send(tabGroups.groups.create, { window: "main", from: { kind: "tab", tabId } });
	const placed = await main.send(navigation.tabs.placedTabs, { window: "main" });
	check(
		"a group born around a tab stands in its list",
		[placed.ok ? placed.output.lists["workspace"]?.some((entry) => entry.kind === "group") : placed.reason, grouped.ok],
		[true, true],
	);
	await groupPlacingChecks(main, grouped.ok ? grouped.output.id : "");
}

async function groupPlacingChecks(main: Runtime, groupId: string): Promise<void> {
	const toOpen = await main.send(tabGroups.groups.place, {
		window: "main",
		id: groupId,
		place: { list: "workspace", before: null },
	});
	const afterOpen = await main.send(navigation.tabs.placedTabs, { window: "main" });
	const lists = afterOpen.ok ? afterOpen.output.lists : {};
	check(
		"a group carried to the end of the list stands last there",
		[toOpen.ok, lists["workspace"]?.at(-1)?.id],
		[true, groupId],
	);
	await main.send(navigation.tabPlacing.place, {
		at: askAt("main"),
		id: "chat-b",
		place: { list: "workspace", groupId, before: null },
	});
	const intoChat = await main.send(tabGroups.groups.place, {
		window: "main",
		id: groupId,
		place: { list: "chat-a", before: null },
	});
	check(
		"a group holding a chat cannot stand inside another chat",
		intoChat.ok ? "placed" : intoChat.reason,
		'no tab list "chat-a" is here',
	);
}

const HANDOFF_APP_BY_EXTENSION: Readonly<Record<string, string>> = {
	md: "canvas",
	rs: "rocket",
};

const MARKDOWN_TO_CANVAS_PLACED_APP = placedAppOf({
	id: "file",
	title: "File",
	handoffAppOf: (path) => HANDOFF_APP_BY_EXTENSION[path.slice(path.lastIndexOf(".") + 1)] ?? null,
});

async function openedAppAndAddressAt(main: Runtime, address: string): Promise<readonly unknown[]> {
	const opened = await main.send(navigation.tabOpening.openTab, { at: askAt("main"), app: "file", address });
	const placed = await main.send(navigation.tabs.placedTabs, { window: "main" });
	const tab = placed.ok && opened.ok ? placed.output.tabs.find(({ id }) => id === opened.output.id) : undefined;
	return [tab?.app, tab?.lastAddress];
}

async function handoffChecks(): Promise<void> {
	const core = localTransport();
	core.serve(
		runtime()
			.modules(
				RunnablePlacesModule({
					injects: {
						tabs: new MemoryTabsGateway(),
						placedApps: new ListedPlacedAppsGateway([...BUILT_IN_PLACED_APPS, MARKDOWN_TO_CANVAS_PLACED_APP]),
					},
				}),
			)
			.start({ platform: "server", env: {} }),
	);
	const main = windowOver(core);
	check(
		"an app whose handoffAppOf names another app opens the address there",
		await openedAppAndAddressAt(main, "/notes/plan.md"),
		["canvas", "/notes/plan.md"],
	);
	check(
		"an address its handoffAppOf names no app for opens in the app itself",
		await openedAppAndAddressAt(main, "/notes/plan.txt"),
		["file", "/notes/plan.txt"],
	);
	check("a handoff to an app Sumi lacks opens in the app itself", await openedAppAndAddressAt(main, "/src/main.rs"), [
		"file",
		"/src/main.rs",
	]);
}

async function sidebarTabIdsIn(windowApp: Runtime, at: TabsAsk): Promise<unknown> {
	const sidebar = await windowApp.send(navigation.tabs.sidebar, { at });
	return sidebar.ok
		? sidebar.output.sections.map((section) => [
				section.list,
				section.entries.flatMap((entry) => (entry.kind === "tab" ? [entry.tab.id] : [])),
			])
		: sidebar.reason;
}

async function windowTabsChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const [main, side] = windowsOver(tabs);
	await main.send(navigation.windows.openWindow, { window: "main" });
	await side.send(navigation.windows.openWindow, { window: "studio-2" });
	await main.send(navigation.tabOpening.openTab, { at: askAt("main"), app: "canvas" });
	await main.send(navigation.tabOpening.openTab, { at: askAt("main"), app: "canvas" });
	await side.send(navigation.tabOpening.openTab, { at: askAt("studio-2"), app: "canvas" });
	check(
		"two windows see the same tabs of the workspace in the sidebar",
		[await sidebarTabIdsIn(main, askAt("main")), await sidebarTabIdsIn(side, askAt("studio-2"))],
		[[["workspace", ["tab-1", "tab-2", "tab-3"]]], [["workspace", ["tab-1", "tab-2", "tab-3"]]]],
	);

	const held = await side.send(navigation.tabShowing.show, { at: askAt("studio-2"), id: "tab-2" });
	check(
		"a window that shows a tab another window holds brings that window forward instead",
		held.ok ? held.output.effects : held.reason,
		[{ kind: "focus-window", window: "main" }],
	);
	const closedElsewhere = await side.send(navigation.tabClosing.closeTab, { at: askAt("studio-2"), id: "tab-2" });
	check(
		"and cannot close it",
		closedElsewhere.ok ? "closed" : closedElsewhere.reason,
		'the tab "tab-2" is open in window main: only that window closes it',
	);
	const renamed = await side.send(navigation.tabPlacing.rename, { window: "studio-2", id: "tab-2", label: "Plan" });
	check("but may rename it", renamed.ok, true);

	const free = await side.send(navigation.tabShowing.show, { at: askAt("studio-2"), id: "tab-1" });
	check(
		"a tab no window shows opens where it is asked",
		[free.ok, (await tabs.placedTabs()).views["studio-2"]?.shownId],
		[true, "tab-1"],
	);

	await main.send(navigation.windows.closeWindow, { window: "main" });
	const afterClose = await tabs.placedTabs();
	check(
		"closing a window keeps its tabs in the workspace and frees them",
		[afterClose.tabs.map((tab) => tab.id), Object.keys(afterClose.views), afterClose.windows.map(({ label }) => label)],
		[["tab-1", "tab-2", "tab-3"], ["studio-2"], ["studio-2"]],
	);
	const taken = await side.send(navigation.tabShowing.show, { at: askAt("studio-2"), id: "tab-2" });
	check(
		"a tab a closed window held opens anywhere at once: no hold outlives its window",
		[
			taken.ok ? taken.output.effects.some((effect) => effect.kind === "focus-window") : taken.reason,
			(await tabs.placedTabs()).views["studio-2"]?.shownId,
		],
		[false, "tab-2"],
	);

	await side.send(navigation.windows.keepLiveWindows, { windows: [] });
	const none = await tabs.placedTabs();
	check(
		"when no window is left, every tab stays in the workspace and none is held",
		[none.tabs.length, none.windows.length, Object.keys(none.views).length],
		[3, 0, 0],
	);
}

async function workspaceListsMigrationChecks(): Promise<void> {
	const workspace = DEFAULT.id;
	const tabOf = (id: string): Record<string, unknown> => ({ id, app: "canvas", pageId: null, label: null });
	const global = PlacedTabsSchema.parse({
		tabs: [tabOf("tab-1"), tabOf("tab-2"), tabOf("tab-9")],
		lists: {
			[`window:main@${workspace}`]: [{ kind: "tab", id: "tab-1" }],
			[`window:studio-2@${workspace}`]: [{ kind: "tab", id: "tab-2" }],
			"window:main@other": [{ kind: "tab", id: "tab-9" }],
		},
		views: { [`main@${workspace}`]: { shownId: "tab-1" }, "main@other": { shownId: "tab-9" } },
		sessions: [
			{
				id: "old",
				window: `studio-3@${workspace}`,
				closedAt: 1,
				tabs: [tabOf("tab-4")],
				lists: { workspace: [{ kind: "tab", id: "tab-4" }] },
				groups: [],
				splits: [],
				view: null,
			},
			{
				id: "new",
				window: `studio-3@${workspace}`,
				closedAt: 2,
				tabs: [tabOf("tab-5")],
				lists: { workspace: [{ kind: "tab", id: "tab-5" }] },
				groups: [],
				splits: [],
				view: null,
			},
		],
		minted: 9,
		closed: [],
	});
	const carried = workspaceTabsOf(global, workspace);
	check(
		"the global places.json gives a workspace its own tabs: live window lists and the newest session of a closed window",
		[
			carried.placed.tabs.map((tab) => tab.id),
			carried.placed.lists["workspace"]?.map((entry) => entry.id),
			Object.keys(carried.placed.views),
			carried.placed.sessions.map((session) => session.id),
			carried.placed.minted,
			tabBreaksOf(momentOfWindow(carried.placed, null, BUILT_IN_APPS)),
		],
		[["tab-1", "tab-2", "tab-5"], ["tab-1", "tab-2", "tab-5"], [`main@${workspace}`], ["old"], 9, []],
	);

	const fake = new FakeStore();
	const root = workspaceRootOf(workspace);
	fake.put(`${root}:navigation.json`, {
		v: 1,
		rev: 1,
		tabs: {
			tabs: [tabOf("tab-1"), tabOf("tab-2")],
			lists: {
				[`window:main@${workspace}`]: [{ kind: "tab", id: "tab-1" }],
				workspace: [{ kind: "tab", id: "tab-2" }],
			},
			minted: 2,
			closed: [],
		},
	});
	const store = new StoreClient(fake.invoke);
	const kept = HeldDoc.read({ store, root, kind: NAVIGATION, empty: KeptNavigationSchema.parse({}) });
	const [main] = windowsOver(new TauriTabsGateway(kept));
	check(
		"a list kept under a window id folds into the list of the workspace on first read",
		await sidebarTabIdsIn(main, askAt(placesWindowOf("main", workspace))),
		[["workspace", ["tab-2", "tab-1"]]],
	);
	const stored = fake.files.get(`${root}:navigation.json`)?.["tabs"];
	check(
		"and the file keeps only the list of the workspace",
		typeof stored === "object" && stored !== null && "lists" in stored ? Object.keys(stored.lists ?? {}) : stored,
		["workspace"],
	);
}

const quiet = console.info;
console.info = () => undefined;
await handoffChecks();
await unreadableChecks();
await oneWriterChecks();
await lawChecks();
await declaredRuleChecks();
await windowTabsChecks();
await workspaceListsMigrationChecks();
console.info = quiet;
console.log(tally.failed ? `places tabs: ${tally.failed} check(s) failed` : "places tabs: all checks passed");
process.exit(tally.failed ? 1 : 0);
