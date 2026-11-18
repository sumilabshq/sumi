import { BUILT_IN_APPS } from "./placed-apps-fixture.ts";
import { tabRowsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/rows/tab-rows.ts";
import {
	emptyMoment,
	findGroup,
	flatTabIdsOf,
	markShown,
	openTab,
	placeTab,
	tabOf,
} from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/host-tabs.ts";
import { closeGroup, closeTabs, reopenClosed } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-closing.ts";
import { addGroup, placeGroup, ungroup } from "../plugins/tabs/tab-groups/data/tab-groups/shared/lib/tab-groups.ts";
import { rememberPages } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/page-memory.ts";
import type { HostTabsMoment, MovedTabs, TabGroup } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/host-tabs.ts";
import { WORKSPACE_LIST, locationOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-lists.ts";
import { tabBreaksOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-invariants.ts";
import { withTabsClosed } from "../plugins/tabs/navigation/data/navigation/shared/lib/showing/closing.ts";
import {
	showingOf,
	withFreeTabBesidePanes,
	withPageEnsured,
	withTabShown,
	withTabTornOff,
} from "../plugins/tabs/navigation/data/navigation/shared/lib/showing/showing.ts";
import type { TabFacts } from "../plugins/tabs/navigation/data/navigation/shared/lib/showing/tab-facts.ts";

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

const ONE = WORKSPACE_LIST;
const TWO = "window:other";
const atEnd = (list: string) => ({ chatId: list, groupId: null, before: null });
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

function factsOf(inPanes: readonly string[]): TabFacts {
	return {
		pages: [],
		isBrowserAvailable: false,
		canOpenOwnWindow: false,
		tabPanes: inPanes.map((tabId) => ({ paneId: `pane-${tabId}`, tabId })),
		shownTabPaneId: null,
		hasTabTarget: false,
		tabTargetId: null,
		chatGroupIds: [],
		tabWindows: new Map(),
	};
}

const first = addGroup(threeTabs(), { chatId: ONE, withTabId: "tab-2", inGroupId: null });
const second = addGroup(first.moment, { chatId: ONE, withTabId: null, inGroupId: null });
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
check("placing a tab into a group puts it before the asked row", groupOf(placed, first.groupId).entries, [
	{ kind: "tab", id: "tab-3" },
	{ kind: "tab", id: "tab-2" },
]);
const inner = addGroup(placed, { chatId: ONE, withTabId: null, inGroupId: first.groupId });
const nested = movedTo(
	placeTab(inner.moment, "tab-1", { chatId: ONE, groupId: inner.groupId, before: null }),
	inner.moment,
);
check(
	"a group born inside a group stands last in it, and a tab placed in it stays in the list of the outer group",
	[groupOf(nested, first.groupId).entries, flatTabIdsOf(nested, ONE), locationOf(nested, "tab-1"), tabBreaksOf(nested)],
	[
		[
			{ kind: "tab", id: "tab-3" },
			{ kind: "tab", id: "tab-2" },
			{ kind: "group", id: inner.groupId },
		],
		["tab-3", "tab-2", "tab-1"],
		{ chatId: ONE, groupId: inner.groupId, at: 0 },
		[],
	],
);
const carriedOut = movedTo(
	placeGroup(nested, groupOf(nested, inner.groupId), { chatId: ONE, groupId: null, before: first.groupId }),
	nested,
);
check(
	"a group carried out of its holder stands in the list before the asked entry, with its tabs",
	[carriedOut.lists[ONE]?.map((entry) => entry.id), groupOf(carriedOut, first.groupId).entries.length, tabBreaksOf(carriedOut)],
	[[inner.groupId, first.groupId, second.groupId], 2, []],
);
const carriedIn = movedTo(
	placeGroup(carriedOut, groupOf(carriedOut, first.groupId), { chatId: ONE, groupId: inner.groupId, before: "tab-1" }),
	carriedOut,
);
check(
	"a group carried into a group stands before the asked entry of it",
	[groupOf(carriedIn, inner.groupId).entries.map((entry) => entry.id), flatTabIdsOf(carriedIn, ONE), tabBreaksOf(carriedIn)],
	[[first.groupId, "tab-1"], ["tab-3", "tab-2", "tab-1"], []],
);
const outerSpilled = ungroup(carriedIn, groupOf(carriedIn, inner.groupId)).moment;
check(
	"ungrouping the holder spills its tabs and groups where it stood",
	[outerSpilled.lists[ONE]?.map((entry) => entry.id), tabBreaksOf(outerSpilled)],
	[[first.groupId, "tab-1", second.groupId], []],
);
const nestedClosed = closeGroup(carriedIn, groupOf(carriedIn, inner.groupId), new Map()).moment;
check(
	"closing a group closes the tabs of the groups inside it and drops those groups too",
	[nestedClosed.groups.map((group) => group.id), nestedClosed.tabs.length, tabBreaksOf(nestedClosed)],
	[[second.groupId], 0, []],
);
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
const reopened = reopenClosed(groupClosed, groupClosed.closed.at(-1)?.tab.id ?? "")?.moment ?? groupClosed;
check(
	"a closed tab of a closed group reopens in Open where it stood, not in Pinned",
	[flatTabIdsOf(reopened, TWO), flatTabIdsOf(reopened, WORKSPACE_LIST)],
	[[], ["tab-1", "tab-3", "tab-2"]],
);
const workspaceTab = openTab(emptyMoment(BUILT_IN_APPS), browser, atEnd(WORKSPACE_LIST)).moment;
const workspaceClosed = closeTabs(workspaceTab, new Map(), {
	ids: ["tab-1"],
	reason: "close the workspace tab",
}).moment;
const workspaceReopened =
	reopenClosed(workspaceClosed, workspaceClosed.closed.at(-1)?.tab.id ?? "")?.moment ?? workspaceClosed;
const twoClosed = closeTabs(openTab(workspaceTab, browser, atEnd(WORKSPACE_LIST)).moment, new Map(), {
	ids: ["tab-1", "tab-2"],
	reason: "close both workspace tabs",
}).moment;
const firstReopened = reopenClosed(twoClosed, twoClosed.closed[0]?.tab.id ?? "")?.moment ?? twoClosed;
check(
	"reopening a closed tab by its id keeps the others closed",
	[flatTabIdsOf(firstReopened, WORKSPACE_LIST), firstReopened.closed.map(({ tab }) => tab.id)],
	[[twoClosed.closed[0]?.tab.id ?? ""], [twoClosed.closed[1]?.tab.id ?? ""]],
);
check("a closed Open tab reopens in Open", flatTabIdsOf(workspaceReopened, WORKSPACE_LIST), ["tab-1"]);

const panedClosed = withTabsClosed(showingOf({ ...threeTabs(), view: "browser" }), factsOf(["tab-3"]), {
	ids: ["tab-3"],
	reason: "close",
});
check(
	"closing a tab closes the pane holding it in the same action",
	panedClosed.effects.filter((effect) => effect.kind === "close-panes"),
	[{ kind: "close-panes", tabIds: ["tab-3"] }],
);

const shownSecond = movedTo(markShown(threeWorkspaceTabs(), "tab-2"), threeWorkspaceTabs());
const freed = withFreeTabBesidePanes(showingOf({ ...shownSecond, view: "browser" }), factsOf(["tab-2"]));
check(
	"a shown tab dragged into a pane leaves the shown-tab pane to a free tab",
	freed.moment.shownId === "tab-2",
	false,
);

const shownFirst = movedTo(markShown(threeWorkspaceTabs(), "tab-1"), threeWorkspaceTabs());
const everyPaned = withFreeTabBesidePanes(
	showingOf({ ...shownFirst, view: "browser" }),
	factsOf(["tab-1", "tab-2", "tab-3"]),
);
check(
	"with no free tab left the shown-tab pane closes",
	everyPaned.effects.map((effect) => effect.kind),
	["close-shown-tab-pane"],
);

const focusedElsewhere = {
	...factsOf(["tab-2"]),
	shownTabPaneId: "pane-shown",
	hasTabTarget: true,
	tabTargetId: "pane-tab-2",
};
const firstTab = shownFirst.tabs.find((tab) => tab.id === "tab-1");
const pressedShown =
	firstTab === undefined
		? null
		: withTabShown(showingOf({ ...shownFirst, view: "browser" }), focusedElsewhere, { ...firstTab, pageId: "page-1" });
const freshShown =
	firstTab === undefined
		? null
		: withTabShown(showingOf({ ...shownFirst, view: "browser" }), focusedElsewhere, firstTab);
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

const tornShown = withTabTornOff(showingOf({ ...shownFirst, view: "browser" }), factsOf(["tab-2"]), "tab-1");
check(
	"a shown tab torn off into its own window hands the screen to a free tab",
	[tornShown.moment.shownId, tornShown.effects.some((effect) => effect.kind === "close-panes")],
	["tab-3", false],
);
const tornPaned = withTabTornOff(showingOf({ ...shownFirst, view: "browser" }), factsOf(["tab-2"]), "tab-2");
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
	[tabOf(movedTo(remembered, withPage), "tab-1").lastAddress],
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
	showingOf({ ...restarted, view: "browser" }),
	{ ...factsOf([]), isBrowserAvailable: true },
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
	showingOf({ ...namedElsewhere, view: "browser" }),
	{ ...factsOf([]), isBrowserAvailable: true },
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

const unloaded = tabRowsOf({ ...restarted, view: "browser" }, [], [ONE]);
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
	tabs: restarted.tabs.map((tab) => (tab.id === "tab-3" ? { ...tab, lastAddress: "https://example.com/" } : tab)),
};
check(
	"an unloaded tab whose page never had a title shows its site",
	tabRowsOf({ ...titleless, view: "browser" }, [], [ONE]).find((row) => row.id === "tab-3")?.title,
	"example.com",
);

console.info = quiet;
console.log(failed === 0 ? "host tabs: all checks pass" : `host tabs: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
