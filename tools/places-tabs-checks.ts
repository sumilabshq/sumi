import { app, localTransport } from "../packages/shared/core/src/requests/index.ts";
import type { StartedApp } from "../packages/shared/core/src/requests/index.ts";
import { server } from "../packages/shared/core/src/requests/server/index.ts";
import { HeldDoc } from "../packages/shared/behaviors/src/tauri-store/held-doc.ts";
import { StoreClient, workspaceRootOf } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import type { DocKind } from "../packages/shared/behaviors/src/tauri-store/store-client.ts";
import {
	CreateGroupCommand,
	KeepChatTabsCommand,
	OpenTabCommand,
	PinTabCommand,
	PlaceTabCommand,
	PlacedTabsQuery,
	PlacesModule,
	ShowTabCommand,
} from "../packages/state/places/index.ts";
import type { Screen, TabsAsk } from "../packages/state/places/index.ts";
import { PlacesModule as RunnablePlacesModule } from "../packages/state/places/module.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { TauriTabsGateway } from "../packages/state/places/gateways/tabs/tauri/tauri.gateway.ts";
import { MemoryWindowsGateway } from "../packages/state/places/gateways/windows/memory.gateway.ts";
import { KeptPlacesSchema } from "../packages/state/places/gateways/windows/tauri.gateway.ts";
import type { KeptPlaces } from "../packages/state/places/gateways/windows/tauri.gateway.ts";
import { DEFAULT, FakeStore } from "./host-tauri-fake-store.ts";
import { check, tally, waitFor } from "./check-helpers.ts";

const PLACES: DocKind<KeptPlaces> = {
	file: "places.json",
	v: 1,
	schema: KeptPlacesSchema,
};

const NO_SCREEN: Screen = {
	pages: [],
	isBrowserAvailable: false,
	canOpenOwnWindow: false,
	tabPanes: [],
	shownTabPaneId: null,
	tabTargetId: null,
	chatGroups: [],
	elsewhere: [],
	focusedChatId: null,
};

function askAt(window: string): TabsAsk {
	return { window, view: "canvas", screen: NO_SCREEN };
}

function windowsOver(tabs: MemoryTabsGateway | TauriTabsGateway): readonly [StartedApp, StartedApp] {
	const core = localTransport();
	server()
		.modules(RunnablePlacesModule.with({ windows: new MemoryWindowsGateway({ windows: [] }), tabs }))
		.listen(core)
		.start({ env: {} });
	return [app().imports(PlacesModule.over(core)).start(), app().imports(PlacesModule.over(core)).start()];
}

async function listsIn(windowApp: StartedApp, window: string): Promise<unknown> {
	const placed = await windowApp.send(PlacedTabsQuery, { window });
	return placed.ok ? [placed.output.lists, placed.output.shownId] : placed.reason;
}

async function migrationChecks(): Promise<void> {
	const fake = new FakeStore();
	const root = workspaceRootOf(DEFAULT.id);
	fake.put(`${root}:session.json`, {
		v: 1,
		rev: 1,
		tabs: {
			tabs: ["tab-1", "tab-2", "tab-3"].map((id) => ({ id, app: "browser", pageId: null, label: null })),
			lists: {
				workspace: [{ kind: "tab", id: "tab-1" }],
				"chat-a": [{ kind: "tab", id: "tab-2" }],
				"chat-gone": [{ kind: "tab", id: "tab-3" }],
			},
			shownId: "tab-2",
			minted: 3,
			closed: [],
		},
	});
	fake.put(`${root}:chats.json`, {
		v: 1,
		rev: 1,
		chats: [
			{ id: "chat-a", isPinned: true, pinRank: 0, lastAt: 1, title: null, createdAt: 1 },
			{ id: "chat-b", isPinned: false, lastAt: 5, title: null, createdAt: 1 },
			{ id: "chat-c", isPinned: false, lastAt: 9, title: null, createdAt: 1 },
		],
	});
	const store = new StoreClient(fake.invoke);
	const tabsIn = (): TauriTabsGateway =>
		new TauriTabsGateway({
			store,
			root,
			kept: HeldDoc.read({ store, root, kind: PLACES, empty: KeptPlacesSchema.parse({}) }),
		});
	const [main] = windowsOver(tabsIn());
	check(
		"the first read moves the tabs, their chat lists and the chats' pin order into places",
		await listsIn(main, "main"),
		[
			{
				"chat-a": [{ kind: "tab", id: "tab-2" }],
				pinned: [{ kind: "tab", id: "chat-a" }],
				workspace: [
					{ kind: "tab", id: "chat-c" },
					{ kind: "tab", id: "chat-b" },
					{ kind: "tab", id: "tab-1" },
					{ kind: "tab", id: "tab-3" },
				],
			},
			"tab-2",
		],
	);
	check(
		"and writes only the new shape, into places.json",
		fake.files.get(`${root}:places.json`)?.["tabs"] !== undefined,
		true,
	);

	fake.put(`${root}:chats.json`, { v: 1, rev: 2, chats: [] });
	const [again] = windowsOver(tabsIn());
	const placed = await again.send(PlacedTabsQuery, { window: "main" });
	check(
		"a second start reads places.json and never migrates again",
		placed.ok ? placed.output.tabs.filter((tab) => tab.app === "chat").map((tab) => tab.id) : placed.reason,
		["chat-a", "chat-b", "chat-c"],
	);
}

async function unreadableChecks(): Promise<void> {
	const fake = new FakeStore();
	const root = workspaceRootOf(DEFAULT.id);
	fake.put(`${root}:session.json`, { v: 1, rev: 1, tabs: { tabs: [], shownId: null, minted: 4, closed: [] } });
	fake.put(`${root}:places.json`, { v: 1, rev: 1, tabs: { broken: true } });
	const store = new StoreClient(fake.invoke);
	const kept = HeldDoc.read({ store, root, kind: PLACES, empty: KeptPlacesSchema.parse({}) });
	const [main] = windowsOver(new TauriTabsGateway({ store, root, kept }));
	const placed = await main.send(PlacedTabsQuery, { window: "main" });
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
		main.send(OpenTabCommand, { at: askAt("main"), app: "canvas" }),
		side.send(OpenTabCommand, { at: askAt("studio-2"), app: "canvas" }),
	]);
	check(
		"two windows opening a tab at once each get their own, minted by the one writer",
		opened.map((answer) => (answer.ok ? answer.output.id : answer.reason)),
		["tab-1", "tab-2"],
	);

	const [mainView, sideView] = await Promise.all([listsIn(main, "main"), listsIn(side, "studio-2")]);
	check(
		"each window keeps the tab it shows apart, over one list of tabs",
		[Array.isArray(mainView) ? mainView : [], Array.isArray(sideView) ? sideView : []],
		[
			[
				{
					workspace: [
						{ kind: "tab", id: "tab-1" },
						{ kind: "tab", id: "tab-2" },
					],
				},
				"tab-1",
			],
			[
				{
					workspace: [
						{ kind: "tab", id: "tab-1" },
						{ kind: "tab", id: "tab-2" },
					],
				},
				"tab-2",
			],
		],
	);

	const heard = { count: 0 };
	main.routes.watch(PlacedTabsQuery, { window: "main" }, () => {
		heard.count += 1;
	});
	await side.send(ShowTabCommand, { at: askAt("studio-2"), id: "tab-1" });
	check("and the other window hears the change without asking", await waitFor(() => heard.count > 0), true);
}

async function lawChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const [main] = windowsOver(tabs);
	await main.send(KeepChatTabsCommand, {
		chats: [
			{ id: "chat-a", title: null },
			{ id: "chat-b", title: null },
		],
	});
	await main.send(KeepChatTabsCommand, {
		chats: [
			{ id: "chat-a", title: null },
			{ id: "chat-b", title: null },
		],
	});
	const tab = await main.send(OpenTabCommand, { at: askAt("main"), app: "canvas", list: "chat-a" });
	const tabId = tab.ok ? tab.output.id : "";
	const chatInChat = await main.send(PlaceTabCommand, {
		at: askAt("main"),
		id: "chat-b",
		place: { list: "chat-a", groupId: null, before: null },
	});
	const noChat = await main.send(PlaceTabCommand, {
		at: askAt("main"),
		id: tabId,
		place: { list: "tab-1", groupId: null, before: null },
	});
	check(
		"a chat is kept once, a chat holds no chat, and only a chat holds a list",
		[
			(await tabs.placedTabs()).tabs.filter((one) => one.app === "chat").length,
			chatInChat.ok ? "placed" : chatInChat.reason,
			noChat.ok ? "placed" : noChat.reason,
		],
		[
			2,
			'the tab "chat-b" holds tabs of its own: it cannot stand inside "chat-a"',
			'no tab list "tab-1" is here: a tab stands in Open, Pinned or a chat',
		],
	);

	await main.send(PinTabCommand, { window: "main", id: tabId, isPinned: true });
	const grouped = await main.send(CreateGroupCommand, { window: "main", from: { kind: "tab", tabId } });
	const placed = await tabs.placedTabs();
	check(
		"pinning moves the tab out of its chat into Pinned, and a group born around it stands there",
		[placed.lists["chat-a"], placed.lists["pinned"]?.at(-1)?.kind, grouped.ok],
		[[], "group", true],
	);
}

const quiet = console.info;
console.info = () => undefined;
await migrationChecks();
await unreadableChecks();
await oneWriterChecks();
await lawChecks();
console.info = quiet;
console.log(tally.failed ? `places tabs: ${tally.failed} check(s) failed` : "places tabs: all checks passed");
process.exit(tally.failed ? 1 : 0);
