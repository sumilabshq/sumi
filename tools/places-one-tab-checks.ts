import { BARE_SCREEN } from "./places-fixture.ts";
import { builtInPlacedApps } from "./placed-apps-fixture.ts";
import { runtime, localTransport } from "../packages/shared/data-framework/src/index.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import {
	AppTabQuery,
	CloseTabCommand,
	ClosedTabsQuery,
	FoldTabCommand,
	KeepChatTabsCommand,
	MakeEssentialCommand,
	MarkTabSeenCommand,
	OpenTabCommand,
	PlaceTabCommand,
	PlacesModule,
	RecordTabTurnCommand,
	RecordAppAddressCommand,
	ReopenClosedTabCommand,
	ShowTabCommand,
	ShowViewCommand,
	SidebarQuery,
	TearOffTabCommand,
} from "../plugins/apps/data/places/index.ts";
import type { AppTabState, PlacedSidebar, TabChild, TabsAsk } from "../plugins/apps/data/places/index.ts";
import { PlacesModule as RunnablePlacesModule } from "../plugins/apps/data/places/module.ts";
import { MemoryTabsGateway } from "../plugins/apps/data/places/gateways/tabs/memory.gateway.ts";
import { MemoryWindowsGateway } from "../plugins/apps/data/places/gateways/windows/memory.gateway.ts";
import { check, tally } from "./check-helpers.ts";

const WINDOW = "main";

const AT: TabsAsk = {
	window: WINDOW,
	screen: BARE_SCREEN,
};

function placesApp(tabs: MemoryTabsGateway): Runtime {
	const core = localTransport();
	core.serve(
		runtime()
			.modules(
				RunnablePlacesModule({
					injects: { windows: new MemoryWindowsGateway({ windows: [] }), tabs, placedApps: builtInPlacedApps() },
				}),
			)
			.start({ platform: "server", env: {} }),
	);
	return runtime()
		.imports(PlacesModule({ over: core }))
		.start();
}

async function sidebarOf(places: Runtime): Promise<PlacedSidebar | string> {
	const answer = await places.send(SidebarQuery, { at: AT, essentials: [] });
	return answer.ok ? answer.output : answer.reason;
}

function openRowsOf(sidebar: PlacedSidebar | string): unknown {
	if (typeof sidebar === "string") {
		return sidebar;
	}

	return sidebar.sections
		.flatMap((section) => section.entries)
		.map((entry) =>
			entry.kind === "tab" ? [entry.tab.title, entry.tab.mark, entry.children?.length ?? null] : entry.kind,
		);
}

async function wholeChatChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const places = placesApp(tabs);
	await places.send(KeepChatTabsCommand, { chats: [{ id: "chat-a", title: "Release plan" }] });
	await places.send(OpenTabCommand, { at: AT, app: "canvas", list: "chat-a" });
	await places.send(RecordTabTurnCommand, { id: "chat-a", title: null, isBusy: true, isSeen: false });
	check(
		"places alone answers a chat row: its title, its running mark and its artifacts, with no chat record anywhere",
		openRowsOf(await sidebarOf(places)),
		[["Release plan", "running", 1]],
	);

	await chatIdChecks(places);
	await turnEndingChecks(places);
	await archiveChecks(places, tabs);
}

async function chatIdOf(places: Runtime): Promise<string | null> {
	const answer = await places.send(AppTabQuery, { id: "chat-a" });
	return answer.ok ? answer.output.chatId : answer.reason;
}

async function chatIdChecks(places: Runtime): Promise<void> {
	const kept = await chatIdOf(places);
	await places.send(RecordAppAddressCommand, { id: "chat-a", address: "/elsewhere" });
	check(
		"a chat tab's chatId is its own id, whatever address the app records",
		[kept, await chatIdOf(places)],
		["chat-a", "chat-a"],
	);
}

async function turnEndingChecks(places: Runtime): Promise<void> {
	await places.send(RecordTabTurnCommand, { id: "chat-a", title: null, isBusy: false, isSeen: false });
	const unread = openRowsOf(await sidebarOf(places));
	await places.send(MarkTabSeenCommand, { id: "chat-a" });
	check(
		"a turn ending unseen marks the tab unread, and seeing it clears the mark",
		[unread, openRowsOf(await sidebarOf(places))],
		[[["Release plan", "unread", 1]], [["Release plan", "none", 1]]],
	);
}

async function archiveChecks(places: Runtime, tabs: MemoryTabsGateway): Promise<void> {
	const closed = await places.send(CloseTabCommand, { at: AT, id: "chat-a" });
	const closedRows = await places.send(ClosedTabsQuery);
	check(
		"closing a chat tab archives it with its artifacts: it leaves the list and stands among the closed tabs",
		[
			closed.ok,
			openRowsOf(await sidebarOf(places)),
			closedRows.ok ? closedRows.output.tabs.map((row) => [row.tabId, row.title]) : closedRows.reason,
			(await tabs.placedTabs()).closed[0]?.held?.tabs.length,
		],
		[true, [], [["chat-a", "Release plan"]], 1],
	);

	await places.send(KeepChatTabsCommand, { chats: [{ id: "chat-a", title: "Release plan" }] });
	check("a closed chat is not brought back by its record", openRowsOf(await sidebarOf(places)), []);

	await places.send(ReopenClosedTabCommand, { at: AT, tabId: "chat-a" });
	check("reopening brings the chat back with its artifacts", openRowsOf(await sidebarOf(places)), [
		["Release plan", "none", 1],
	]);
}

async function sameForEveryTabChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const places = placesApp(tabs);
	await places.send(KeepChatTabsCommand, {
		chats: [
			{ id: "chat-a", title: "One" },
			{ id: "chat-b", title: "Two" },
		],
	});
	const inChat = await places.send(PlaceTabCommand, {
		at: AT,
		id: "chat-b",
		place: { list: "chat-a", groupId: null, before: null },
	});
	const essential = await places.send(MakeEssentialCommand, { at: AT, id: "chat-b", essentialId: "essential-1" });
	check(
		"a chat dropped onto a chat is refused, and a chat becomes an essential like any tab",
		[inChat.ok ? "placed" : inChat.reason, essential.ok ? essential.output.title : essential.reason],
		['the tab "chat-b" cannot stand inside "chat-a": its app does not let it', "Two"],
	);
}

async function foldChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const places = placesApp(tabs);
	await places.send(KeepChatTabsCommand, { chats: [{ id: "chat-a", title: "One" }] });
	const opened = await places.send(OpenTabCommand, { at: AT, app: "canvas", list: null });
	const tabId = opened.ok ? opened.output.id : "";
	await places.send(FoldTabCommand, { window: WINDOW, id: "chat-a" });
	const folded = await sidebarOf(places);
	const plain = await places.send(FoldTabCommand, { window: WINDOW, id: tabId });
	const foldedOf = (sidebar: PlacedSidebar | string): unknown =>
		typeof sidebar === "string"
			? sidebar
			: sidebar.sections
					.flatMap((section) => section.entries)
					.map((entry) => (entry.kind === "tab" ? (entry.isFolded ?? null) : null));
	check(
		"a tab that holds tabs folds as a fact of places, and a tab holding none is refused",
		[foldedOf(folded), plain.ok ? "folded" : plain.reason],
		[[true, null], `the tab "${tabId}" holds no tabs: there is nothing under it to fold`],
	);
}

async function reuseChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const places = placesApp(tabs);
	const ask = { at: AT, app: "tasks" as const, address: "T-7", reusesHeld: true };
	const first = await places.send(OpenTabCommand, ask);
	const again = await places.send(OpenTabCommand, ask);
	const other = await places.send(OpenTabCommand, { ...ask, address: "T-8" });
	const idOf = (opened: typeof first): string => (opened.ok ? opened.output.id : opened.reason);
	check(
		"an open that reuses a held tab shows the tab at that address instead of opening a second one",
		[
			idOf(again) === idOf(first),
			idOf(other) === idOf(first),
			(await tabs.placedTabs()).tabs.filter((tab) => tab.app === "tasks").length,
		],
		[true, false, 2],
	);
}

async function oneWindowOwnerChecks(): Promise<void> {
	const places = placesApp(new MemoryTabsGateway());
	await places.send(KeepChatTabsCommand, { chats: [{ id: "chat-b", title: "Draft" }] });
	const terminal = await places.send(OpenTabCommand, { at: AT, app: "terminal", list: null });
	const terminalId = terminal.ok ? terminal.output.id : terminal.reason;
	const able = { ...AT, screen: { ...BARE_SCREEN, canOpenOwnWindow: true } };
	const held = { ...able, screen: { ...able.screen, elsewhere: [{ window: "studio-2", tabIds: ["chat-b"] }] } };
	const effectsOf = (answer: { readonly ok: boolean; readonly output?: { readonly effects: readonly unknown[] } }) =>
		answer.ok ? answer.output?.effects : "refused";
	check(
		"places tears off a chat and a page-less app tab by one command, each into a window of its own",
		[
			effectsOf(await places.send(TearOffTabCommand, { at: able, id: "chat-b" })),
			effectsOf(await places.send(TearOffTabCommand, { at: able, id: terminalId })),
		],
		[
			[
				{ kind: "close-chat-panes", chatIds: ["chat-b"] },
				{ kind: "tear-off-tab", tabId: "chat-b", view: "chat" },
			],
			[{ kind: "tear-off-tab", tabId: terminalId, view: "app" }, { kind: "close-shown-tab-pane" }],
		],
	);
	check(
		"a chat another window holds comes forward on open and on tear-off, decided by places alone",
		[
			effectsOf(await places.send(ShowTabCommand, { at: held, id: "chat-b" })),
			effectsOf(await places.send(TearOffTabCommand, { at: held, id: "chat-b" })),
		],
		[[{ kind: "focus-window", window: "studio-2" }], [{ kind: "focus-window", window: "studio-2" }]],
	);
}

function childTabsOf(children: readonly TabChild[]): readonly AppTabState[] {
	return children.flatMap((child) => (child.kind === "tab" ? [child.tab] : child.group.tabs));
}

async function selectionChecks(): Promise<void> {
	const places = placesApp(new MemoryTabsGateway());
	await places.send(KeepChatTabsCommand, { chats: [{ id: "chat-b", title: "Draft" }] });
	const onScreen: TabsAsk = {
		...AT,
		screen: {
			...BARE_SCREEN,
			shownTabPaneId: "pane-shown",
			chatGroups: [{ chatId: "chat-b", paneIds: ["pane-chat"] }],
		},
	};
	const canvas = await places.send(OpenTabCommand, { at: onScreen, app: "canvas", list: null });
	const tasks = await places.send(OpenTabCommand, { at: onScreen, app: "tasks", list: null });
	const canvasId = canvas.ok ? canvas.output.id : canvas.reason;
	const tasksId = tasks.ok ? tasks.output.id : tasks.reason;
	const readHighlightedIds = async (at: TabsAsk): Promise<readonly string[]> => {
		const answer = await places.send(SidebarQuery, { at, essentials: [] });
		return answer.ok
			? answer.output.sections
					.flatMap((section) => section.entries)
					.flatMap((entry) => (entry.kind === "tab" ? [entry.tab, ...childTabsOf(entry.children ?? [])] : []))
					.flatMap((tab) => (tab.isShown ? [tab.id] : []))
			: [answer.reason];
	};
	const showTabThenReadHighlightedIds = async (id: string, at: TabsAsk = onScreen): Promise<readonly string[]> => {
		await places.send(ShowTabCommand, { at, id });
		return readHighlightedIds(at);
	};
	check(
		"one press highlights the pressed tab alone, whatever its app, a chat included",
		[
			await showTabThenReadHighlightedIds(tasksId),
			await showTabThenReadHighlightedIds(canvasId),
			await showTabThenReadHighlightedIds("chat-b"),
		],
		[[tasksId], [canvasId], ["chat-b"]],
	);
	const inChat = await places.send(OpenTabCommand, { at: onScreen, app: "canvas", list: "chat-b" });
	const inChatId = inChat.ok ? inChat.output.id : inChat.reason;
	const withInChatPane: TabsAsk = {
		...onScreen,
		screen: {
			...onScreen.screen,
			tabPanes: [{ paneId: "pane-beside", tabId: inChatId }],
			chatGroups: [{ chatId: "chat-b", paneIds: ["pane-chat", "pane-beside"] }],
		},
	};
	check(
		"a tab inside a chat is highlighted together with its chat",
		await showTabThenReadHighlightedIds(inChatId, withInChatPane),
		["chat-b", inChatId],
	);
	await places.send(ShowTabCommand, { at: withInChatPane, id: "chat-b", isFollowingFocus: true });
	const afterFocus = await readHighlightedIds(withInChatPane);
	await places.send(ShowTabCommand, { at: withInChatPane, id: "chat-b" });
	check(
		"focus moving into a chat keeps the selection on its tab, a press on the chat selects the chat",
		[afterFocus, await readHighlightedIds(withInChatPane)],
		[["chat-b", inChatId], ["chat-b"]],
	);
	const chatView = await places.send(ShowViewCommand, { window: onScreen.window, view: "chat" });
	check(
		"the shown view names an app whose tabs run in a page, never a chat",
		chatView.ok ? "shown" : chatView.reason,
		'the view "chat" names no app whose tabs run in a page',
	);
}

const quiet = console.info;
console.info = () => undefined;
await selectionChecks();
await wholeChatChecks();
await sameForEveryTabChecks();
await foldChecks();
await reuseChecks();
await oneWindowOwnerChecks();
console.info = quiet;
console.log(tally.failed ? `places one tab: ${tally.failed} check(s) failed` : "places one tab: all checks passed");
process.exit(tally.failed ? 1 : 0);
