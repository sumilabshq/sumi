import { HostTabs, flatTabIdsOf } from "../packages/app-host/shared/lib/host-tabs/host-tabs.ts";
import { WORKSPACE_LIST } from "../packages/app-host/shared/lib/host-tabs/tab-lists.ts";
import { NoPaneTabsGateway } from "../packages/app-host/gateways/pane-tabs/none.gateway.ts";
import { PaneTabsGateway } from "../packages/app-host/gateways/pane-tabs/pane-tabs.gateway.ts";
import { closeTabs } from "../packages/app-host/shared/lib/tab-showing/close-tab.ts";
import { showFreeTabBesidePanes } from "../packages/app-host/shared/lib/tab-showing/show-tab.ts";
import { Essentials } from "../packages/app-host/shared/lib/essentials/essentials.ts";
import { KeptTabsSchema } from "../packages/app-host/shared/schema/tabs-session.schema.ts";
import { chatTabToShow, showChatTab } from "../packages/app-host/shared/lib/tab-showing/chat-tabs.ts";
import type { AppKind } from "../packages/app-host/shared/schema/app-tab.schema.ts";
import type { PageFacts } from "../packages/app-host/shared/schema/page-facts.schema.ts";

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

function threeTabs(): HostTabs {
	const hostTabs = new HostTabs(null, ONE);
	hostTabs.open(browser, atEnd(ONE));
	hostTabs.open(browser, atEnd(ONE));
	hostTabs.open(browser, atEnd(ONE));
	return hostTabs;
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
const migrated = new HostTabs(legacy, ONE);
check(
	"a session from before lists and groups opens with every tab in the current chat",
	flatTabIdsOf(migrated.now(), ONE),
	["tab-1", "tab-2"],
);

const grouped = threeTabs();
const firstGroup = grouped.newGroup(ONE, "tab-2");
const secondGroup = grouped.newGroup(ONE, null);
check(
	"groups are named New group, then New group 2, and a group made with a tab stands where the tab stood",
	[grouped.now().groups.map((group) => group.name), grouped.now().lists[ONE]],
	[
		["New group", "New group 2"],
		[
			{ kind: "tab", id: "tab-1" },
			{ kind: "group", id: firstGroup },
			{ kind: "tab", id: "tab-3" },
			{ kind: "group", id: secondGroup },
		],
	],
);
grouped.place("tab-3", { chatId: ONE, groupId: firstGroup, before: "tab-2" });
check(
	"placing a tab into a group puts it before the asked row",
	grouped.now().groups.find((group) => group.id === firstGroup)?.tabIds,
	["tab-3", "tab-2"],
);
grouped.ungroup(firstGroup);
check("ungrouping spills the tabs in order where the group stood", flatTabIdsOf(grouped.now(), ONE), [
	"tab-1",
	"tab-3",
	"tab-2",
]);
grouped.place("tab-1", { chatId: ONE, groupId: secondGroup, before: null });
grouped.closeGroup(secondGroup, new Map());
check(
	"closing a group closes its tabs and drops the group in one change",
	[grouped.now().groups.length, flatTabIdsOf(grouped.now(), ONE)],
	[1 - 1, ["tab-3", "tab-2"]],
);
grouped.reopenClosed(TWO);
check(
	"a closed tab whose chat is not on screen reopens in the workspace",
	[flatTabIdsOf(grouped.now(), TWO), flatTabIdsOf(grouped.now(), WORKSPACE_LIST)],
	[[], ["tab-1"]],
);
const kept = new HostTabs(null, ONE);
kept.open(browser, atEnd(WORKSPACE_LIST));
kept.close(["tab-1"], new Map(), "close the workspace tab");
kept.reopenClosed(TWO);
check("a closed workspace tab reopens in the workspace in any chat", flatTabIdsOf(kept.now(), WORKSPACE_LIST), [
	"tab-1",
]);

const essentials = new Essentials(null);
const shared = threeTabs();
const essentialId = essentials.add(
	{ app: "browser", address: "https://mail.example/", title: "Mail", favicon: null },
	1,
);
shared.makeEssential("tab-2", essentialId);
check(
	"a tab made Essential leaves the chat's list, and Essentials start with Canvas",
	[flatTabIdsOf(shared.now(), ONE), essentials.now().essentials.map((one) => one.title)],
	[
		["tab-1", "tab-3"],
		["Canvas", "Mail"],
	],
);
shared.place("tab-2", atEnd(TWO));
check(
	"an Essential dropped into a list is an ordinary tab of that chat",
	[shared.tabOf("tab-2").essentialId, flatTabIdsOf(shared.now(), TWO)],
	[null, ["tab-2"]],
);

const followed = threeTabs();
followed.open(browser, atEnd(TWO));
followed.show("tab-2");
const shownApps: AppKind[] = [];
const showing = {
	appTabsGateway: {
		shownApp: () => "browser" as const,
		show: (app: AppKind) => void shownApps.push(app),
		closePanel: () => undefined,
	},
	pageFactsGateway: {
		isAvailable: () => false,
		pages: (): readonly PageFacts[] => [],
		showPage: () => undefined,
		openPage: () => undefined,
		closePage: () => undefined,
		openAddress: () => undefined,
	},
	paneTabsGateway: new NoPaneTabsGateway(),
};
showChatTab(followed, TWO, showing);
check("switching chats shows the new chat's tab", followed.now().shownId, "tab-4");
showChatTab(followed, ONE, showing);
check(
	"switching back shows the tab that chat showed last",
	[followed.now().shownId, chatTabToShow(followed, ONE)],
	["tab-2", "tab-2"],
);

class RecordedPanes extends PaneTabsGateway {
	closedFor: readonly string[] = [];
	isShownTabPaneOpen = true;

	constructor(private readonly paned: readonly string[]) {
		super();
	}

	tabIdsInPanes(): readonly string[] {
		return this.paned;
	}

	reveal(): void {}

	closePanesOf(tabIds: readonly string[]): void {
		this.closedFor = tabIds;
	}

	openShownTabPane(): void {
		this.isShownTabPaneOpen = true;
	}

	closeShownTabPane(): void {
		this.isShownTabPaneOpen = false;
	}

	watch(): () => void {
		return () => undefined;
	}
}

const paned = threeTabs();
const panes = new RecordedPanes(["tab-3"]);
closeTabs(["tab-3"], paned, { ...showing, paneTabsGateway: panes }, "close a tab standing in a pane");
check("closing a tab closes the pane holding it in the same action", panes.closedFor, ["tab-3"]);

const moved = threeTabs();
moved.show("tab-2");
showFreeTabBesidePanes(moved, { ...showing, paneTabsGateway: new RecordedPanes(["tab-2"]) });
check(
	"a shown tab dragged into a pane leaves the shown-tab pane to a free tab",
	moved.now().shownId === "tab-2",
	false,
);

const allPaned = threeTabs();
allPaned.show("tab-1");
const everyPane = new RecordedPanes(allPaned.now().tabs.map((tab) => tab.id));
showFreeTabBesidePanes(allPaned, { ...showing, paneTabsGateway: everyPane });
check("with no free tab left the shown-tab pane closes", everyPane.isShownTabPaneOpen, false);

console.info = quiet;
console.log(failed === 0 ? "host tabs: all checks pass" : `host tabs: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
