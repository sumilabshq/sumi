import { BUILT_IN_APPS } from "./placed-apps-fixture.ts";
import { tabRowsOf } from "../plugins/apps/data/places/shared/lib/rows/tab-rows.ts";
import {
	emptyMoment,
	findGroup,
	flatTabIdsOf,
	makeEssential,
	markShown,
	openTab,
	placeTab,
	tabOf,
} from "../plugins/apps/data/places/shared/lib/tabs/host-tabs.ts";
import { closeGroup, closeTabs, reopenClosed } from "../plugins/apps/data/places/shared/lib/tabs/tab-closing.ts";
import { addGroup, ungroup } from "../plugins/apps/data/places/shared/lib/tabs/tab-groups.ts";
import { rememberPages } from "../plugins/apps/data/places/shared/lib/tabs/page-memory.ts";
import type { HostTabsMoment, MovedTabs, TabGroup } from "../plugins/apps/data/places/shared/lib/tabs/host-tabs.ts";
import { WORKSPACE_LIST } from "../plugins/apps/data/places/shared/lib/tabs/tab-lists.ts";
import { addEssential, essentialsOf } from "../packages/domain/app-host/shared/lib/essentials/essentials.ts";
import { withTabsClosed } from "../plugins/apps/data/places/shared/lib/showing/closing.ts";
import {
	chatTabToShow,
	showingOf,
	withChatTabShown,
	withFreeTabBesidePanes,
	withPageEnsured,
	withMoved,
	withTabPressed,
	withTabShown,
	withTabTornOff,
} from "../plugins/apps/data/places/shared/lib/showing/showing.ts";
import { withHomeFollowed, withTabsAtHome } from "../plugins/apps/data/places/shared/lib/showing/rehoming.ts";
import type { TabFacts } from "../plugins/apps/data/places/shared/lib/showing/tab-facts.ts";
import { KeptSessionTabsSchema, migratedTabsOf } from "../plugins/apps/data/places/gateways/tabs/tauri/kept-session.ts";
import { momentOfWindow } from "../plugins/apps/data/places/shared/lib/tabs/kept-tabs.ts";

let failed = 0;
const quiet = console.info;
console.info = () => undefined;

function check(name: string, seen: unknown, wanted: unknown): void {
	const isOk = JSON.stringify(seen) === JSON.stringify(wanted);

	if (!isOk) {
		failed += 1;
	}

	console.log(
		`${isOk ? "ok  " : "FAIL"} ${name}${isOk ? "" : ` — saw ${JSON.stringify(seen)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const ONE = "chat-1";
const TWO = "chat-2";
const atEnd = (chatId: string) => ({ chatId, groupId: null, before: null });
const browser = { app: "browser" as const, pageId: null };

function movedTo(moved: MovedTabs | null, was: HostTabsMoment): HostTabsMoment {
	return moved?.moment ?? was;
}

function threeTabs(): HostTabsMoment {
	const one = openTab(emptyMoment(BUILT_IN_APPS), browser, atEnd(ONE)).moment;
	const two = openTab(one, browser, atEnd(ONE)).moment;
	return openTab(two, browser, atEnd(ONE)).moment;
}

function threeWorkspaceTabs(): HostTabsMoment {
	const one = openTab(emptyMoment(BUILT_IN_APPS), browser, atEnd(WORKSPACE_LIST)).moment;
	const two = openTab(one, browser, atEnd(WORKSPACE_LIST)).moment;
	return openTab(two, browser, atEnd(WORKSPACE_LIST)).moment;
}

function groupOf(moment: HostTabsMoment, id: string): TabGroup {
	const group = findGroup(moment.groups, id);

	if (!group) {
		throw new Error(`no group ${id}`);
	}

	return group;
}

function factsOf(chatId: string, inPanes: readonly string[]): TabFacts {
	return {
		pages: [],
		isBrowserAvailable: false,
		canOpenOwnWindow: false,
		tabPanes: inPanes.map((tabId) => ({ paneId: `pane-${tabId}`, tabId })),
		shownTabPaneId: null,
		hasTabTarget: false,
		tabTargetId: null,
		chatGroupIds: [chatId],
		tabWindows: new Map(),
		groupOfPane: new Map(),
		focusedChatId: chatId,
	};
}

const legacy = KeptSessionTabsSchema.parse({
	tabs: [
		{ id: "tab-1", app: "canvas", pageId: null, isPinned: true, label: null },
		{ id: "tab-2", app: "browser", pageId: null, isPinned: false, label: "Docs" },
	],
	shownId: "tab-2",
	minted: 2,
	closed: [],
});
check(
	"a session from before lists and groups opens with every tab in the open tabs",
	flatTabIdsOf(momentOfWindow(migratedTabsOf(legacy, []), "main", BUILT_IN_APPS), WORKSPACE_LIST),
	["tab-1", "tab-2"],
);

const first = addGroup(threeTabs(), ONE, "tab-2");
const second = addGroup(first.moment, ONE, null);
const grouped = second.moment;
check(
	"groups are named New group, then New group 2, and a group made with a tab stands where the tab stood",
	[grouped.groups.map((group) => group.name), grouped.lists[ONE]],
	[
		["New group", "New group 2"],
		[
			{ kind: "tab", id: "tab-1" },
			{ kind: "group", id: first.groupId },
			{ kind: "tab", id: "tab-3" },
			{ kind: "group", id: second.groupId },
		],
	],
);
const placed = movedTo(placeTab(grouped, "tab-3", { chatId: ONE, groupId: first.groupId, before: "tab-2" }), grouped);
check("placing a tab into a group puts it before the asked row", groupOf(placed, first.groupId).tabIds, [
	"tab-3",
	"tab-2",
]);
const spilled = ungroup(placed, groupOf(placed, first.groupId)).moment;
check("ungrouping spills the tabs in order where the group stood", flatTabIdsOf(spilled, ONE), [
	"tab-1",
	"tab-3",
	"tab-2",
]);
const intoSecond = movedTo(placeTab(spilled, "tab-1", { chatId: ONE, groupId: second.groupId, before: null }), spilled);
const groupClosed = closeGroup(intoSecond, groupOf(intoSecond, second.groupId), new Map()).moment;
check(
	"closing a group closes its tabs and drops the group in one change",
	[groupClosed.groups.length, flatTabIdsOf(groupClosed, ONE)],
	[0, ["tab-3", "tab-2"]],
);
const reopened = reopenClosed(groupClosed, TWO, groupClosed.closed.at(-1)?.tab.id ?? "")?.moment ?? groupClosed;
check(
	"a closed tab whose chat is not on screen reopens in the workspace",
	[flatTabIdsOf(reopened, TWO), flatTabIdsOf(reopened, WORKSPACE_LIST)],
	[[], ["tab-1"]],
);
const workspaceTab = openTab(emptyMoment(BUILT_IN_APPS), browser, atEnd(WORKSPACE_LIST)).moment;
const workspaceClosed = closeTabs(workspaceTab, new Map(), {
	ids: ["tab-1"],
	reason: "close the workspace tab",
}).moment;
const workspaceReopened =
	reopenClosed(workspaceClosed, TWO, workspaceClosed.closed.at(-1)?.tab.id ?? "")?.moment ?? workspaceClosed;
const twoClosed = closeTabs(openTab(workspaceTab, browser, atEnd(WORKSPACE_LIST)).moment, new Map(), {
	ids: ["tab-1", "tab-2"],
	reason: "close both workspace tabs",
}).moment;
const firstReopened = reopenClosed(twoClosed, TWO, twoClosed.closed[0]?.tab.id ?? "")?.moment ?? twoClosed;
check(
	"reopening a closed tab by its id keeps the others closed",
	[flatTabIdsOf(firstReopened, WORKSPACE_LIST), firstReopened.closed.map(({ tab }) => tab.id)],
	[[twoClosed.closed[0]?.tab.id ?? ""], [twoClosed.closed[1]?.tab.id ?? ""]],
);
check("a closed workspace tab reopens in the workspace in any chat", flatTabIdsOf(workspaceReopened, WORKSPACE_LIST), [
	"tab-1",
]);

const added = addEssential(
	essentialsOf(null),
	{ app: "browser", address: "https://mail.example/", title: "Mail", favicon: null },
	1,
);
const shared = makeEssential(threeTabs(), "tab-2", added.id).moment;
check(
	"a tab made Essential leaves the chat's list, and Essentials start with Canvas",
	[flatTabIdsOf(shared, ONE), added.kept.essentials.map((one) => one.title)],
	[
		["tab-1", "tab-3"],
		["Canvas", "Mail"],
	],
);
const released = movedTo(placeTab(shared, "tab-2", atEnd(TWO)), shared);
check(
	"an Essential dropped into a list is an ordinary tab of that chat",
	[tabOf(released, "tab-2").essentialId, flatTabIdsOf(released, TWO)],
	[null, ["tab-2"]],
);

const fourTabs = openTab(threeTabs(), browser, atEnd(TWO)).moment;
const followed = movedTo(markShown(fourTabs, "tab-2"), fourTabs);
const inTwo = withChatTabShown(showingOf(followed, "browser"), factsOf(TWO, []), TWO);
check(
	"switching chats shows the new chat's tab in its group, only while the group holds no tab",
	inTwo.effects.filter((effect) => effect.kind === "show-in-chat-group"),
	[{ kind: "show-in-chat-group", chatId: TWO, tabId: "tab-4", isOnlyWhenBare: true }],
);
const chatTabPressed = withTabShown(showingOf(fourTabs, "browser"), factsOf(ONE, []), tabOf(fourTabs, "tab-3"));
check(
	"a chat tab pressed in the sidebar goes to its chat's group, never to the shown-tab pane",
	[chatTabPressed.moment.shownId, chatTabPressed.effects.map((effect) => effect.kind)],
	[fourTabs.shownId, ["show-in-chat-group"]],
);
const chatClosedPressed = withTabPressed(
	showingOf(fourTabs, "browser"),
	{ ...factsOf(ONE, []), chatGroupIds: [] },
	tabOf(fourTabs, "tab-3"),
);
check(
	"a pressed tab whose chat left the board brings the chat back first",
	chatClosedPressed.effects.map((effect) => effect.kind),
	["show-chat", "show-in-chat-group"],
);
const offBoardPressed = withTabPressed(
	showingOf(fourTabs, "browser"),
	factsOf("chat-elsewhere", []),
	tabOf(fourTabs, "tab-3"),
);
check(
	"a pressed tab of any chat off the board brings that chat, not only the focused one",
	offBoardPressed.effects.map((effect) => effect.kind),
	["show-chat", "show-in-chat-group"],
);
const otherChatTab = withTabShown(
	showingOf(fourTabs, "browser"),
	factsOf("chat-elsewhere", []),
	tabOf(fourTabs, "tab-3"),
);
check(
	"a chat tab the app shows on its own never brings a chat that is off the board",
	otherChatTab.effects.map((effect) => effect.kind),
	[],
);
const backInOne = withChatTabShown(inTwo, factsOf(ONE, []), ONE);
check(
	"switching back shows the tab that chat showed last",
	[backInOne.moment.shownId, chatTabToShow(backInOne.moment, ONE)],
	["tab-2", "tab-2"],
);

const panedClosed = withTabsClosed(showingOf(threeTabs(), "browser"), factsOf(ONE, ["tab-3"]), {
	ids: ["tab-3"],
	reason: "close",
});
check(
	"closing a tab closes the pane holding it in the same action",
	panedClosed.effects.filter((effect) => effect.kind === "close-panes"),
	[{ kind: "close-panes", tabIds: ["tab-3"] }],
);

const shownSecond = movedTo(markShown(threeWorkspaceTabs(), "tab-2"), threeWorkspaceTabs());
const freed = withFreeTabBesidePanes(showingOf(shownSecond, "browser"), factsOf(ONE, ["tab-2"]));
check(
	"a shown tab dragged into a pane leaves the shown-tab pane to a free tab",
	freed.moment.shownId === "tab-2",
	false,
);

const shownFirst = movedTo(markShown(threeWorkspaceTabs(), "tab-1"), threeWorkspaceTabs());
const everyPaned = withFreeTabBesidePanes(showingOf(shownFirst, "browser"), factsOf(ONE, ["tab-1", "tab-2", "tab-3"]));
check(
	"with no free tab left the shown-tab pane closes",
	everyPaned.effects.map((effect) => effect.kind),
	["close-shown-tab-pane"],
);

const focusedElsewhere = {
	...factsOf(ONE, ["tab-2"]),
	shownTabPaneId: "pane-shown",
	hasTabTarget: true,
	tabTargetId: "pane-tab-2",
};
const firstTab = shownFirst.tabs.find((tab) => tab.id === "tab-1");
const pressedShown =
	firstTab === undefined
		? null
		: withTabShown(showingOf(shownFirst, "browser"), focusedElsewhere, { ...firstTab, pageId: "page-1" });
const freshShown =
	firstTab === undefined ? null : withTabShown(showingOf(shownFirst, "browser"), focusedElsewhere, firstTab);
check(
	"a fresh tab with no page yet is shown, never mistaken for one already open",
	freshShown?.effects.some((effect) => effect.kind === "flash-pane"),
	false,
);
check(
	"a tab open in the shown-tab pane, pressed while another pane is focused, focuses its own pane and moves nowhere",
	pressedShown?.effects.map((effect) => [effect.kind, "paneId" in effect ? effect.paneId : null]),
	[["flash-pane", "pane-shown"]],
);

const tornShown = withTabTornOff(showingOf(shownFirst, "browser"), factsOf(ONE, ["tab-2"]), "tab-1");
check(
	"a shown tab torn off into its own window hands the screen to a free tab",
	[tornShown.moment.shownId, tornShown.effects.some((effect) => effect.kind === "close-panes")],
	["tab-3", false],
);
const tornPaned = withTabTornOff(showingOf(shownFirst, "browser"), factsOf(ONE, ["tab-2"]), "tab-2");
check(
	"a tab torn off from a pane closes that pane and leaves the shown tab alone",
	[tornPaned.moment.shownId, tornPaned.effects],
	["tab-1", [{ kind: "close-panes", tabIds: ["tab-2"] }]],
);

const paged = movedTo(markShown(threeTabs(), "tab-1"), threeTabs());
const withPage = { ...paged, tabs: paged.tabs.map((tab) => (tab.id === "tab-1" ? { ...tab, pageId: "page-1" } : tab)) };
const page = {
	pageId: "page-1",
	url: "https://duckduckgo.com/?q=test",
	title: "test at DuckDuckGo",
	favicon: "https://duckduckgo.com/favicon.ico",
};
const remembered = rememberPages(withPage, [page]);
check(
	"a page's address is remembered on its tab for the next start; its title and icon are the apps module's",
	[
		tabOf(movedTo(remembered, withPage), "tab-1").lastAddress,
	],
	[page.url],
);
check(
	"a blank page and an unchanged page remember nothing",
	[rememberPages(withPage, [{ ...page, url: "about:blank" }]), rememberPages(movedTo(remembered, withPage), [page])],
	[null, null],
);
const restarted = {
	...movedTo(remembered, withPage),
	tabs: movedTo(remembered, withPage).tabs.map((tab) => ({ ...tab, pageId: null })),
};
const reopenedAfterStart = withPageEnsured(
	showingOf(restarted, "browser"),
	{ ...factsOf(ONE, []), isBrowserAvailable: true },
	{
		tabId: "tab-1",
		why: "shown",
	},
);
check(
	"after a start, a tab that gets a fresh page opens the address it last showed",
	reopenedAfterStart.showing.effects.map((effect) => (effect.kind === "open-address" ? effect.address : effect.kind)),
	["open-page", page.url],
);

const namedElsewhere = {
	...paged,
	tabs: paged.tabs.map((tab) => (tab.id === "tab-1" ? { ...tab, pageId: "page-from-window-1" } : tab)),
};
const adoptedHere = withPageEnsured(
	showingOf(namedElsewhere, "browser"),
	{ ...factsOf(ONE, []), isBrowserAvailable: true },
	{
		tabId: "tab-1",
		why: "placed in a pane",
	},
);
check(
	"a tab naming a page this window does not hold opens that same page here, never a new one",
	[adoptedHere.pageId, adoptedHere.showing.effects.map((effect) => effect.kind)],
	["page-from-window-1", ["open-page"]],
);

const unloaded = tabRowsOf(restarted, [], "browser", [ONE]);
check(
	"after a start, an unloaded tab shows its site and no icon until the apps module titles it, and a never-loaded one reads New tab",
	[
		unloaded.find((row) => row.id === "tab-1")?.title,
		unloaded.find((row) => row.id === "tab-1")?.favicon,
		unloaded.find((row) => row.id === "tab-2")?.title,
	],
	["duckduckgo.com", null, "New tab"],
);

const titleless = {
	...restarted,
	tabs: restarted.tabs.map((tab) =>
		tab.id === "tab-3" ? { ...tab, lastAddress: "https://example.com/" } : tab,
	),
};
check(
	"an unloaded tab whose page never had a title shows its site",
	tabRowsOf(titleless, [], "browser", [ONE]).find((row) => row.id === "tab-3")?.title,
	"example.com",
);

const workspaceShown = movedTo(markShown(threeWorkspaceTabs(), "tab-1"), threeWorkspaceTabs());
const shownPaneFacts = { ...factsOf(ONE, []), shownTabPaneId: "pane-shown" };
const shownWas = showingOf(workspaceShown, "browser");
const shownMoved = withMoved(shownWas, placeTab(workspaceShown, "tab-1", atEnd(ONE)));
const shownFollowed = withHomeFollowed(shownWas, shownMoved, shownPaneFacts);
check(
	"the shown workspace tab dragged into a chat goes to that chat's group and the shown pane takes a free tab",
	[
		shownFollowed.effects.filter((effect) => effect.kind === "show-in-chat-group").map((effect) => effect.tabId),
		shownFollowed.moment.shownId,
	],
	[["tab-1"], "tab-2"],
);
const panedWas = showingOf(workspaceShown, "browser");
const panedMoved = withMoved(panedWas, placeTab(workspaceShown, "tab-3", atEnd(ONE)));
const panedFollowed = withHomeFollowed(panedWas, panedMoved, factsOf(ONE, ["tab-3"]));
check(
	"a workspace tab standing in its own tile moves into its new chat's group",
	panedFollowed.effects.map((effect) => effect.kind),
	["close-panes", "show-in-chat-group"],
);
const sameHome = withMoved(panedWas, placeTab(workspaceShown, "tab-3", atEnd(WORKSPACE_LIST)));
check(
	"a tab reordered inside its own list stays where it stands",
	withHomeFollowed(panedWas, sameHome, factsOf(ONE, ["tab-3"])).effects,
	[],
);

const heldElsewhere = { ...factsOf(ONE, []), tabWindows: new Map([["tab-3", "studio-2"]]) };
check(
	"a chat tab that stands in another window brings that window forward instead of moving here",
	withTabShown(showingOf(fourTabs, "browser"), heldElsewhere, tabOf(fourTabs, "tab-3")).effects,
	[{ kind: "focus-window", window: "studio-2" }],
);

const strayFacts = { ...factsOf(ONE, ["tab-3"]), groupOfPane: new Map() };
check(
	"a chat tab found in a tile outside its chat's group goes back into the group",
	withTabsAtHome(showingOf(fourTabs, "browser"), strayFacts).effects.map((effect) => effect.kind),
	["close-panes", "show-in-chat-group"],
);
const homeFacts = { ...factsOf(ONE, ["tab-3"]), groupOfPane: new Map([["pane-tab-3", ONE]]) };
check(
	"a chat tab already in its chat's group stays",
	withTabsAtHome(showingOf(fourTabs, "browser"), homeFacts).effects,
	[],
);

console.info = quiet;
console.log(failed === 0 ? "host tabs: all checks pass" : `host tabs: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
