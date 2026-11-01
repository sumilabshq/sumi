import { app, localTransport } from "../packages/shared/core/src/requests/index.ts";
import type { StartedApp } from "../packages/shared/core/src/requests/index.ts";
import { server } from "../packages/shared/core/src/requests/server/index.ts";
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
	RecordAppPageCommand,
	ReopenClosedTabCommand,
	SidebarQuery,
} from "../packages/state/places/index.ts";
import type { PlacedSidebar, Screen, TabsAsk } from "../packages/state/places/index.ts";
import { PlacesModule as RunnablePlacesModule } from "../packages/state/places/module.ts";
import { MemoryTabsGateway } from "../packages/state/places/gateways/tabs/memory.gateway.ts";
import { MemoryWindowsGateway } from "../packages/state/places/gateways/windows/memory.gateway.ts";
import { check, tally } from "./check-helpers.ts";

const WINDOW = "main";

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

const AT: TabsAsk = {
	window: WINDOW,
	view: "canvas",
	screen: NO_SCREEN,
};

function placesApp(tabs: MemoryTabsGateway): StartedApp {
	const core = localTransport();
	server()
		.modules(RunnablePlacesModule.with({ windows: new MemoryWindowsGateway({ windows: [] }), tabs }))
		.listen(core)
		.start({ env: {} });
	return app().imports(PlacesModule.over(core)).start();
}

async function sidebarOf(places: StartedApp): Promise<PlacedSidebar | string> {
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

async function chatIdOf(places: StartedApp): Promise<string | null> {
	const answer = await places.send(AppTabQuery, { id: "chat-a" });
	return answer.ok ? answer.output.chatId : answer.reason;
}

async function chatIdChecks(places: StartedApp): Promise<void> {
	const kept = await chatIdOf(places);
	await places.send(RecordAppPageCommand, { id: "chat-a", address: "/elsewhere" });
	check(
		"a chat tab's chatId is its own id, whatever address the app records",
		[kept, await chatIdOf(places)],
		["chat-a", "chat-a"],
	);
}

async function turnEndingChecks(places: StartedApp): Promise<void> {
	await places.send(RecordTabTurnCommand, { id: "chat-a", title: null, isBusy: false, isSeen: false });
	const unread = openRowsOf(await sidebarOf(places));
	await places.send(MarkTabSeenCommand, { id: "chat-a" });
	check(
		"a turn ending unseen marks the tab unread, and seeing it clears the mark",
		[unread, openRowsOf(await sidebarOf(places))],
		[[["Release plan", "unread", 1]], [["Release plan", "none", 1]]],
	);
}

async function archiveChecks(places: StartedApp, tabs: MemoryTabsGateway): Promise<void> {
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
		['the tab "chat-b" holds tabs of its own: it cannot stand inside "chat-a"', "Two"],
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

const quiet = console.info;
console.info = () => undefined;
await wholeChatChecks();
await sameForEveryTabChecks();
await foldChecks();
await reuseChecks();
console.info = quiet;
console.log(tally.failed ? `places one tab: ${tally.failed} check(s) failed` : "places one tab: all checks passed");
process.exit(tally.failed ? 1 : 0);
