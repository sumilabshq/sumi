import {
	addGroup,
	closeGroup,
	closeTabs,
	emptyMoment,
	findGroup,
	flatTabIdsOf,
	makeEssential,
	markShown,
	momentOfKept,
	openTab,
	placeTab,
	reopenLastClosed,
	tabOf,
	ungroup,
} from "../packages/domain/app-host/shared/lib/host-tabs/host-tabs.ts";
import type {
	HostTabsMoment,
	MovedTabs,
	TabGroup,
} from "../packages/domain/app-host/shared/lib/host-tabs/host-tabs.ts";
import { WORKSPACE_LIST } from "../packages/domain/app-host/shared/lib/host-tabs/tab-lists.ts";
import { addEssential, essentialsOf } from "../packages/domain/app-host/shared/lib/essentials/essentials.ts";
import { withTabsClosed } from "../packages/domain/app-host/shared/lib/tab-showing/closing.ts";
import {
	chatTabToShow,
	showingOf,
	withChatTabShown,
	withFreeTabBesidePanes,
} from "../packages/domain/app-host/shared/lib/tab-showing/showing.ts";
import type { TabFacts } from "../packages/domain/app-host/shared/lib/tab-showing/tab-facts.ts";
import { KeptTabsSchema } from "../packages/domain/app-host/shared/schema/tabs-session.schema.ts";

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
	const one = openTab(emptyMoment(), browser, atEnd(ONE)).moment;
	const two = openTab(one, browser, atEnd(ONE)).moment;
	return openTab(two, browser, atEnd(ONE)).moment;
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
		hasTabTarget: false,
		tabTargetId: null,
		chat: { id: chatId, title: "Chat" },
	};
}

const legacy = KeptTabsSchema.parse({
	tabs: [
		{ id: "tab-1", app: "canvas", pageId: null, isPinned: true, label: null },
		{ id: "tab-2", app: "browser", pageId: null, isPinned: false, label: "Docs" },
	],
	shownId: "tab-2",
	minted: 2,
	closed: [],
});
check(
	"a session from before lists and groups opens with every tab in the current chat",
	flatTabIdsOf(momentOfKept(legacy, ONE), ONE),
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
const reopened = reopenLastClosed(groupClosed, TWO)?.moment ?? groupClosed;
check(
	"a closed tab whose chat is not on screen reopens in the workspace",
	[flatTabIdsOf(reopened, TWO), flatTabIdsOf(reopened, WORKSPACE_LIST)],
	[[], ["tab-1"]],
);
const workspaceTab = openTab(emptyMoment(), browser, atEnd(WORKSPACE_LIST)).moment;
const workspaceClosed = closeTabs(workspaceTab, new Map(), {
	ids: ["tab-1"],
	reason: "close the workspace tab",
}).moment;
const workspaceReopened = reopenLastClosed(workspaceClosed, TWO)?.moment ?? workspaceClosed;
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
const inTwo = withChatTabShown(showingOf(followed, "browser"), factsOf(TWO, []));
check("switching chats shows the new chat's tab", inTwo.moment.shownId, "tab-4");
const backInOne = withChatTabShown(inTwo, factsOf(ONE, []));
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

const shownSecond = movedTo(markShown(threeTabs(), "tab-2"), threeTabs());
const freed = withFreeTabBesidePanes(showingOf(shownSecond, "browser"), factsOf(ONE, ["tab-2"]));
check(
	"a shown tab dragged into a pane leaves the shown-tab pane to a free tab",
	freed.moment.shownId === "tab-2",
	false,
);

const shownFirst = movedTo(markShown(threeTabs(), "tab-1"), threeTabs());
const everyPaned = withFreeTabBesidePanes(showingOf(shownFirst, "browser"), factsOf(ONE, ["tab-1", "tab-2", "tab-3"]));
check(
	"with no free tab left the shown-tab pane closes",
	everyPaned.effects.map((effect) => effect.kind),
	["close-shown-tab-pane"],
);

console.info = quiet;
console.log(failed === 0 ? "host tabs: all checks pass" : `host tabs: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
