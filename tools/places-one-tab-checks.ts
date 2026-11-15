import { BARE_SCREEN } from "./places-fixture.ts";
import { builtInPlacedApps, mainHome } from "./placed-apps-fixture.ts";
import { runtime, localTransport } from "../packages/shared/data-framework/src/index.ts";
import type { Runtime } from "../packages/shared/data-framework/src/index.ts";
import { places as placesContract } from "../plugins/tab-strip/data/places/generated/contract.ts";
import type { PlacedSidebar, TabsAsk } from "../plugins/tab-strip/data/places/generated/contract.ts";
import { places as RunnablePlacesModule } from "../plugins/tab-strip/data/places/generated/module.ts";
import { MemoryTabsGateway } from "../plugins/tab-strip/data/places/gateways/tabs/memory.gateway.ts";
import { MemoryWindowsGateway } from "../plugins/tab-strip/data/places/gateways/windows/memory.gateway.ts";
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
					injects: {
						windows: new MemoryWindowsGateway({ windows: [] }),
						tabs,
						placedApps: builtInPlacedApps(),
						home: mainHome(),
					},
				}),
			)
			.start({ platform: "server", env: {} }),
	);
	return runtime()
		.imports(placesContract({ over: core }))
		.start();
}

async function sidebarOf(places: Runtime): Promise<PlacedSidebar | string> {
	const answer = await places.send(placesContract.tabs.sidebar, { at: AT });
	return answer.ok ? answer.output : answer.reason;
}

function openRowsOf(sidebar: PlacedSidebar | string): unknown {
	if (typeof sidebar === "string") {
		return sidebar;
	}

	return sidebar.sections
		.flatMap((section) => section.entries)
		.map((entry) => (entry.kind === "tab" ? [entry.tab.title, entry.tab.mark, entry.isChat] : entry.kind));
}

async function wholeChatChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const places = placesApp(tabs);
	await places.send(placesContract.tabFacts.keepChatTabs, { chats: [{ id: "chat-a", title: "Release plan" }] });
	await places.send(placesContract.tabFacts.recordTurn, { id: "chat-a", title: null, isBusy: true, isSeen: false });
	check(
		"places alone answers a chat row: its title and its running mark, with no chat record anywhere",
		openRowsOf(await sidebarOf(places)),
		[["Release plan", "running", true]],
	);

	await chatIdChecks(places);
	await turnEndingChecks(places);
	await archiveChecks(places);
}

async function chatIdOf(places: Runtime): Promise<string | null> {
	const answer = await places.send(placesContract.tabFacts.ownAppTab, { id: "chat-a" });
	return answer.ok ? answer.output.chatId : answer.reason;
}

async function chatIdChecks(places: Runtime): Promise<void> {
	const kept = await chatIdOf(places);
	await places.send(placesContract.tabFacts.recordAppAddress, { id: "chat-a", address: "/elsewhere" });
	check(
		"a chat tab's chatId is its own id, whatever address the app records",
		[kept, await chatIdOf(places)],
		["chat-a", "chat-a"],
	);
}

async function turnEndingChecks(places: Runtime): Promise<void> {
	await places.send(placesContract.tabFacts.recordTurn, { id: "chat-a", title: null, isBusy: false, isSeen: false });
	const unread = openRowsOf(await sidebarOf(places));
	await places.send(placesContract.tabFacts.markSeen, { id: "chat-a" });
	check(
		"a turn ending unseen marks the tab unread, and seeing it clears the mark",
		[unread, openRowsOf(await sidebarOf(places))],
		[[["Release plan", "unread", true]], [["Release plan", "none", true]]],
	);
}

async function archiveChecks(places: Runtime): Promise<void> {
	const closed = await places.send(placesContract.tabClosing.closeTab, { at: AT, id: "chat-a" });
	const closedRows = await places.send(placesContract.tabs.closedTabs);
	check(
		"closing a chat tab archives it: it leaves the list and stands among the closed tabs",
		[
			closed.ok,
			openRowsOf(await sidebarOf(places)),
			closedRows.ok ? closedRows.output.tabs.map((row) => [row.tabId, row.title]) : closedRows.reason,
		],
		[true, [], [["chat-a", "Release plan"]]],
	);

	await places.send(placesContract.tabFacts.keepChatTabs, { chats: [{ id: "chat-a", title: "Release plan" }] });
	check("a closed chat is not brought back by its record", openRowsOf(await sidebarOf(places)), []);

	await places.send(placesContract.tabOpening.reopenClosed, { at: AT, tabId: "chat-a" });
	check("reopening brings the chat back", openRowsOf(await sidebarOf(places)), [["Release plan", "none", true]]);
}

async function sameForEveryTabChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const places = placesApp(tabs);
	await places.send(placesContract.tabFacts.keepChatTabs, {
		chats: [
			{ id: "chat-a", title: "One" },
			{ id: "chat-b", title: "Two" },
		],
	});
	const inChat = await places.send(placesContract.tabPlacing.place, {
		at: AT,
		id: "chat-b",
		place: { list: "chat-a", groupId: null, before: null },
	});
	check(
		"a chat dropped onto a chat is refused",
		inChat.ok ? "placed" : inChat.reason,
		'the tab "chat-b" cannot stand inside "chat-a": a tab stands only in the list of a window',
	);
}

async function reuseChecks(): Promise<void> {
	const tabs = new MemoryTabsGateway();
	const places = placesApp(tabs);
	const ask = { at: AT, app: "tasks" as const, address: "T-7", reusesHeld: true };
	const first = await places.send(placesContract.tabOpening.openTab, ask);
	const again = await places.send(placesContract.tabOpening.openTab, ask);
	const other = await places.send(placesContract.tabOpening.openTab, { ...ask, address: "T-8" });
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
	await places.send(placesContract.tabFacts.keepChatTabs, { chats: [{ id: "chat-b", title: "Draft" }] });
	const terminal = await places.send(placesContract.tabOpening.openTab, { at: AT, app: "terminal", list: null });
	const terminalId = terminal.ok ? terminal.output.id : terminal.reason;
	const able = { ...AT, screen: { ...BARE_SCREEN, canOpenOwnWindow: true } };
	const held = { ...able, screen: { ...able.screen, elsewhere: [{ window: "studio-2", tabIds: ["chat-b"] }] } };
	const effectsOf = (answer: { readonly ok: boolean; readonly output?: { readonly effects: readonly unknown[] } }) =>
		answer.ok ? answer.output?.effects : "refused";
	check(
		"places tears off a chat and a page-less app tab by one command, each into a window of its own",
		[
			effectsOf(await places.send(placesContract.tabShowing.tearOff, { at: able, id: "chat-b" })),
			effectsOf(await places.send(placesContract.tabShowing.tearOff, { at: able, id: terminalId })),
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
			effectsOf(await places.send(placesContract.tabShowing.show, { at: held, id: "chat-b" })),
			effectsOf(await places.send(placesContract.tabShowing.tearOff, { at: held, id: "chat-b" })),
		],
		[[{ kind: "focus-window", window: "studio-2" }], [{ kind: "focus-window", window: "studio-2" }]],
	);
}

async function selectionChecks(): Promise<void> {
	const places = placesApp(new MemoryTabsGateway());
	await places.send(placesContract.tabFacts.keepChatTabs, { chats: [{ id: "chat-b", title: "Draft" }] });
	const onScreen: TabsAsk = {
		...AT,
		screen: {
			...BARE_SCREEN,
			shownTabPaneId: "pane-shown",
			chatGroups: [{ chatId: "chat-b", paneIds: ["pane-chat"] }],
		},
	};
	const canvas = await places.send(placesContract.tabOpening.openTab, { at: onScreen, app: "canvas", list: null });
	const tasks = await places.send(placesContract.tabOpening.openTab, { at: onScreen, app: "tasks", list: null });
	const canvasId = canvas.ok ? canvas.output.id : canvas.reason;
	const tasksId = tasks.ok ? tasks.output.id : tasks.reason;
	const readHighlightedIds = async (at: TabsAsk): Promise<readonly string[]> => {
		const answer = await places.send(placesContract.tabs.sidebar, { at });
		return answer.ok
			? answer.output.sections
					.flatMap((section) => section.entries)
					.flatMap((entry) => (entry.kind === "tab" ? [entry.tab] : []))
					.flatMap((tab) => (tab.isShown ? [tab.id] : []))
			: [answer.reason];
	};
	const showTabThenReadHighlightedIds = async (id: string, at: TabsAsk = onScreen): Promise<readonly string[]> => {
		await places.send(placesContract.tabShowing.show, { at, id });
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
	const chatView = await places.send(placesContract.tabShowing.showView, { window: onScreen.window, view: "chat" });
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
await reuseChecks();
await oneWindowOwnerChecks();
console.info = quiet;
console.log(tally.failed ? `places one tab: ${tally.failed} check(s) failed` : "places one tab: all checks passed");
process.exit(tally.failed ? 1 : 0);
