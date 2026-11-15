import { placesWindowOf } from "@widgetarium/behaviors";
import { BARE_SCREEN } from "./places-fixture.ts";
import { BUILT_IN_PLACED_APPS, builtInPlacedApps, mainHome } from "./placed-apps-fixture.ts";
import { ListedPlacedAppsGateway } from "../plugins/tab-strip/data/places/gateways/placed-apps/listed.gateway.ts";
import { placedAppOf } from "../plugins/apps/src/features/app-tab/lib/placed-app-of.ts";
import { runtime, localTransport } from "../packages/shared/data-framework/src/index.ts";
import type { RemoteTransport, Runtime } from "../packages/shared/data-framework/src/index.ts";
import { HeldDoc } from "../packages/shared/behaviors/src/tauri-store/held-doc.ts";
import { StoreClient, workspaceRootOf } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import type { DocKind } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import { places } from "../plugins/tab-strip/data/places/generated/contract.ts";
import type { TabsAsk } from "../plugins/tab-strip/data/places/generated/contract.ts";
import { places as RunnablePlacesModule } from "../plugins/tab-strip/data/places/generated/module.ts";
import { MemoryTabsGateway } from "../plugins/tab-strip/data/places/gateways/tabs/memory.gateway.ts";
import { TauriTabsGateway } from "../plugins/tab-strip/data/places/gateways/tabs/tauri/tauri.gateway.ts";
import { MemoryWindowsGateway } from "../plugins/tab-strip/data/places/gateways/windows/memory.gateway.ts";
import { KeptPlacesSchema } from "../plugins/tab-strip/data/places/gateways/windows/tauri.gateway.ts";
import type { KeptPlaces } from "../plugins/tab-strip/data/places/gateways/windows/tauri.gateway.ts";
import { DEFAULT, FakeStore } from "./host-tauri-fake-store.ts";
import { check, tally, waitFor } from "./check-helpers.ts";

const PLACES: DocKind<KeptPlaces> = {
	file: "places.json",
	v: 1,
	schema: KeptPlacesSchema,
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
	return runtime()
		.modules(
			RunnablePlacesModule({
				injects: {
					windows: new MemoryWindowsGateway({ windows: [] }),
					tabs,
					placedApps: builtInPlacedApps(),
					home: mainHome(),
				},
			}),
		)
		.start({ platform: "server", env: {} });
}

function windowOver(core: RemoteTransport): Runtime {
	return runtime()
		.imports(places({ over: core }))
		.start();
}

async function listsIn(windowApp: Runtime, window: string): Promise<unknown> {
	const placed = await windowApp.send(places.tabs.placedTabs, { window });
	return placed.ok ? [placed.output.lists, placed.output.shownId] : placed.reason;
}

async function unreadableChecks(): Promise<void> {
	const fake = new FakeStore();
	const root = workspaceRootOf(DEFAULT.id);
	fake.put(`${root}:session.json`, { v: 1, rev: 1, tabs: { tabs: [], shownId: null, minted: 4, closed: [] } });
	fake.put(`${root}:places.json`, { v: 1, rev: 1, tabs: { broken: true } });
	const store = new StoreClient(fake.invoke);
	const kept = HeldDoc.read({ store, root, kind: PLACES, empty: KeptPlacesSchema.parse({}) });
	const [main] = windowsOver(new TauriTabsGateway({ workspaceId: DEFAULT.id, kept }));
	const placed = await main.send(places.tabs.placedTabs, { window: "main" });
	check(
		"unreadable tabs start empty and are kept aside, never read again from the older files",
		[placed.ok ? placed.output.minted : placed.reason, fake.files.get(`${root}:places.json`)?.["unreadableTabs"]],
		[0, { broken: true }],
	);
}

async function oneWriterChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const [main, side] = windowsOver(tabs);
	const opened = await Promise.all([
		main.send(places.tabOpening.openTab, { at: askAt("main"), app: "canvas" }),
		side.send(places.tabOpening.openTab, { at: askAt("studio-2"), app: "canvas" }),
	]);
	check(
		"two windows opening a tab at once each get their own, minted by the one writer",
		opened.map((answer) => (answer.ok ? answer.output.id : answer.reason)),
		["tab-1", "tab-2"],
	);

	const [mainView, sideView] = await Promise.all([listsIn(main, "main"), listsIn(side, "studio-2")]);
	check(
		"each window keeps only the tabs it opened, in a list of its own",
		[Array.isArray(mainView) ? mainView : [], Array.isArray(sideView) ? sideView : []],
		[
			[{ workspace: [{ kind: "tab", id: "tab-1" }] }, "tab-1"],
			[{ workspace: [{ kind: "tab", id: "tab-2" }] }, "tab-2"],
		],
	);

	const heard = { count: 0 };
	main.routes.watch(places.tabs.placedTabs, { window: "main" }, () => {
		heard.count += 1;
	});
	await side.send(places.tabOpening.openTab, { at: askAt("studio-2"), app: "canvas" });
	check("and the other window hears the change without asking", await waitFor(() => heard.count > 0), true);
}

async function declaredRuleChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const [main] = windowsOver(tabs);
	const canvas = await main.send(places.tabOpening.openTab, { at: askAt("main"), app: "canvas" });
	const below = await main.send(places.tabOpening.openBelow, {
		at: askAt("main"),
		id: canvas.ok ? canvas.output.id : "",
	});
	const placed = await main.send(places.tabs.placedTabs, { window: "main" });
	const belowApp = placed.ok && below.ok ? placed.output.tabs.find(({ id }) => id === below.output.id)?.app : null;
	check("a tab opened below opens the app that declares it navigates", belowApp, "browser");
	const chat = await main.send(places.tabOpening.openTab, { at: askAt("main"), app: "chat" });
	check(
		"opening a tab of the app that declares it draws no page is refused",
		chat.ok ? "opened" : chat.reason,
		"a tab of chat cannot be opened: chat draws no page in a tab",
	);
}

async function lawChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const [main] = windowsOver(tabs);
	await main.send(places.tabFacts.keepChatTabs, {
		chats: [
			{ id: "chat-a", title: null },
			{ id: "chat-b", title: null },
		],
	});
	await main.send(places.tabFacts.keepChatTabs, {
		chats: [
			{ id: "chat-a", title: null },
			{ id: "chat-b", title: null },
		],
	});
	const tab = await main.send(places.tabOpening.openTab, { at: askAt("main"), app: "canvas" });
	const tabId = tab.ok ? tab.output.id : "";
	const chatInChat = await main.send(places.tabPlacing.place, {
		at: askAt("main"),
		id: "chat-b",
		place: { list: "chat-a", groupId: null, before: null },
	});
	const noChat = await main.send(places.tabPlacing.place, {
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
			'the tab "chat-b" cannot stand inside "chat-a": a tab stands only in the list of a window',
			'the tab "tab-1" cannot stand inside "tab-1": a tab stands only in the list of a window',
		],
	);

	const grouped = await main.send(places.tabPlacing.createGroup, { window: "main", from: { kind: "tab", tabId } });
	const placed = await main.send(places.tabs.placedTabs, { window: "main" });
	check(
		"a group born around a tab stands in its list",
		[placed.ok ? placed.output.lists["workspace"]?.some((entry) => entry.kind === "group") : placed.reason, grouped.ok],
		[true, true],
	);
	await groupPlacingChecks(main, grouped.ok ? grouped.output.id : "");
}

async function groupPlacingChecks(main: Runtime, groupId: string): Promise<void> {
	const toOpen = await main.send(places.tabPlacing.placeGroup, {
		window: "main",
		id: groupId,
		place: { list: "workspace", before: null },
	});
	const afterOpen = await main.send(places.tabs.placedTabs, { window: "main" });
	const lists = afterOpen.ok ? afterOpen.output.lists : {};
	check(
		"a group carried to the end of the list stands last there",
		[toOpen.ok, lists["workspace"]?.at(-1)?.id],
		[true, groupId],
	);
	await main.send(places.tabPlacing.place, {
		at: askAt("main"),
		id: "chat-b",
		place: { list: "workspace", groupId, before: null },
	});
	const intoChat = await main.send(places.tabPlacing.placeGroup, {
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
	const opened = await main.send(places.tabOpening.openTab, { at: askAt("main"), app: "file", address });
	const placed = await main.send(places.tabs.placedTabs, { window: "main" });
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
						windows: new MemoryWindowsGateway({ windows: [] }),
						tabs: new MemoryTabsGateway(),
						placedApps: new ListedPlacedAppsGateway([...BUILT_IN_PLACED_APPS, MARKDOWN_TO_CANVAS_PLACED_APP]),
						home: mainHome(),
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
	const sidebar = await windowApp.send(places.tabs.sidebar, { at });
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
	await main.send(places.tabOpening.openTab, { at: askAt("main"), app: "canvas" });
	await main.send(places.tabOpening.openTab, { at: askAt("main"), app: "canvas" });
	await side.send(places.tabOpening.openTab, { at: askAt("studio-2"), app: "canvas" });
	check(
		"two windows each see only their own tabs in the sidebar",
		[await sidebarTabIdsIn(main, askAt("main")), await sidebarTabIdsIn(side, askAt("studio-2"))],
		[
			[["workspace", ["tab-1", "tab-2"]]],
			[["workspace", ["tab-3"]]],
		],
	);

	const foreign = await side.send(places.tabShowing.show, { at: askAt("studio-2"), id: "tab-1" });
	check(
		"a window cannot show a tab another window holds",
		foreign.ok ? "shown" : foreign.reason,
		'the host holds no tab "tab-1"',
	);

	const torn: TabsAsk = {
		window: "studio-2",
		screen: { ...BARE_SCREEN, tabPanes: [{ paneId: "pane-1", tabId: "tab-1" }] },
	};
	await side.send(places.tabShowing.fitToPanes, { at: torn });
	check(
		"a torn-off tab moves into the list of the window that shows it",
		[await sidebarTabIdsIn(main, askAt("main")), await sidebarTabIdsIn(side, askAt("studio-2"))],
		[
			[["workspace", ["tab-2"]]],
			[["workspace", ["tab-3", "tab-1"]]],
		],
	);

	await side.send(places.windows.closeWindow, { window: "studio-2" });
	const placed = await tabs.placedTabs();
	check(
		"closing a window stores it as a session: its tabs leave the window lists, the closed history stays as it was",
		[
			placed.tabs.map((tab) => tab.id),
			placed.closed.map(({ tab }) => tab.id),
			placed.sessions.map((session) => [session.window, session.tabs.map((tab) => tab.id)]),
			Object.keys(placed.lists),
			Object.keys(placed.views).includes("studio-2"),
		],
		[["tab-2"], [], [["studio-2", ["tab-1", "tab-3"]]], ["window:main"], false],
	);

	await main.send(places.windows.closeWindow, { window: "main" });
	check(
		"the main window is a window like any other: closing it stores its session too",
		[(await tabs.placedTabs()).tabs.map((tab) => tab.id), (await tabs.placedTabs()).sessions.length],
		[[], 2],
	);

	await side.send(places.tabOpening.openTab, { at: askAt("studio-3"), app: "canvas" });
	await main.send(places.windows.keepLiveWindows, { windows: ["main"] });
	check(
		"a window no longer open becomes a session when the core checks what is open",
		[(await tabs.placedTabs()).tabs.map((tab) => tab.id), (await tabs.placedTabs()).sessions.length],
		[[], 3],
	);
}

async function workspaceListsMigrationChecks(): Promise<void> {
	const fake = new FakeStore();
	const root = workspaceRootOf(DEFAULT.id);
	fake.put(`${root}:places.json`, {
		v: 1,
		rev: 1,
		tabs: {
			tabs: ["tab-1", "tab-2"].map((id) => ({ id, app: "canvas", pageId: null, label: null })),
			lists: { workspace: [{ kind: "tab", id: "tab-1" }, { kind: "tab", id: "tab-2" }] },
			minted: 2,
			closed: [],
		},
	});
	const store = new StoreClient(fake.invoke);
	const kept = HeldDoc.read({ store, root, kind: PLACES, empty: KeptPlacesSchema.parse({}) });
	const [main, side] = windowsOver(new TauriTabsGateway({ workspaceId: DEFAULT.id, kept }));
	check(
		"the workspace-wide list of an older places.json moves into the main window on first read",
		[
			await sidebarTabIdsIn(main, askAt(placesWindowOf("main", DEFAULT.id))),
			await sidebarTabIdsIn(side, askAt(placesWindowOf("studio-2", DEFAULT.id))),
			Object.keys(KeptPlacesSchema.parse(fake.files.get(`${root}:places.json`)).tabs ?? {}).length > 0,
		],
		[
			[["workspace", ["tab-1", "tab-2"]]],
			[["workspace", []]],
			true,
		],
	);
	const stored = fake.files.get(`${root}:places.json`)?.["tabs"];
	check(
		"and the file keeps it under the main window's list id",
		typeof stored === "object" && stored !== null && "lists" in stored ? Object.keys(stored.lists ?? {}) : stored,
		[`window:main@${DEFAULT.id}`],
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
