import { emptyMoment, openTab } from "../packages/state/places/shared/lib/tabs/host-tabs.ts";
import type { HostTabsMoment } from "../packages/state/places/shared/lib/tabs/host-tabs.ts";
import { WORKSPACE_LIST } from "../packages/state/places/shared/lib/tabs/tab-lists.ts";
import { COLUMN_OPENED_ON, columnWithView } from "../packages/domain/app-host/shared/lib/tabs-column/column-look.ts";
import { sidebarOf } from "../packages/state/places/shared/lib/rows/tab-rows.ts";
import type { PageFacts } from "../packages/state/places/shared/schema/screen.schema.ts";
import type { SidebarView } from "../packages/domain/app-host/shared/schema/tabs-column.schema.ts";
import type { TabsSidebar } from "../packages/domain/app-host/shared/schema/app-tab.schema.ts";

const WORKSPACE_END = { chatId: WORKSPACE_LIST, groupId: null, before: null };

let failed = 0;

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what}${isOk ? "" : ` — saw ${JSON.stringify(got)}`}`);
}

function pageOf(pageId: string, isInOwnWindow: boolean): PageFacts {
	return {
		pageId,
		title: pageId,
		url: `https://example.com/${pageId}`,
		favicon: null,
		isInkReading: false,
		isAskWaiting: false,
		isClosedToInk: false,
		isInOwnWindow,
	};
}

function workspaceTabs(...pageIds: readonly string[]): HostTabsMoment {
	return pageIds.reduce(
		(moment, pageId) => openTab(moment, { app: "browser", pageId }, WORKSPACE_END).moment,
		emptyMoment(),
	);
}

const BOARD_CHAT = { id: "chat-1", title: "Hello" };

function sidebarWith(moment: HostTabsMoment, pages: readonly PageFacts[], view: SidebarView): TabsSidebar {
	return sidebarOf({
		moment,
		essentials: [],
		pages,
		shownApp: null,
		boardChats: [BOARD_CHAT],
		shutLists: [],
		view,
		inPanes: [],
		hasShownTabPane: true,
		elsewhere: [],
	});
}

function sectionsOf(sidebar: TabsSidebar): readonly string[] {
	return sidebar.sections.map((section) => `${section.list}:${section.count}`);
}

function workspaceRowsOf(sidebar: TabsSidebar): readonly string[] {
	return (sidebar.sections[0]?.entries ?? []).flatMap((entry) => (entry.kind === "tab" ? [entry.tab.title] : []));
}

const SHOW_ALL: SidebarView = { hidesEmptyLists: false, hidesOwnWindowTabs: false };
const moment = workspaceTabs("apart", "here");
const pages = [pageOf("apart", true), pageOf("here", false)];

const shown = sidebarWith(moment, pages, SHOW_ALL);
check(
	"with both options off, an empty chat section stands and a tab in its own window is listed",
	JSON.stringify(sectionsOf(shown)) === '["workspace:2","chat-1:0"]' &&
		JSON.stringify(workspaceRowsOf(shown)) === '["apart","here"]',
	[sectionsOf(shown), workspaceRowsOf(shown)],
);

const offBoard = sidebarOf({
	moment: workspaceTabs("lone"),
	essentials: [],
	pages: [],
	shownApp: null,
	boardChats: [],
	shutLists: [],
	view: SHOW_ALL,
	inPanes: [],
	hasShownTabPane: true,
	elsewhere: [],
});
const offBoardLists = [sectionsOf(offBoard), offBoard.listTargets.map((target) => target.list)];
check(
	"a chat that stands on no board of this window has no section, whatever chat was picked last",
	JSON.stringify(offBoardLists) === JSON.stringify([["workspace:1"], [WORKSPACE_LIST]]),
	offBoardLists,
);

const noEmpty = sidebarWith(moment, pages, { ...SHOW_ALL, hidesEmptyLists: true });
check(
	"Hide empty sections drops the empty chat section",
	JSON.stringify(sectionsOf(noEmpty)) === '["workspace:2"]',
	sectionsOf(noEmpty),
);

const noApart = sidebarWith(moment, pages, { ...SHOW_ALL, hidesOwnWindowTabs: true });
check(
	"Hide tabs in other windows drops that row and its count",
	JSON.stringify(workspaceRowsOf(noApart)) === '["here"]' && sectionsOf(noApart)[0] === "workspace:1",
	[workspaceRowsOf(noApart), sectionsOf(noApart)],
);

const closedWindow = sidebarWith(moment, [pageOf("apart", false), pageOf("here", false)], {
	...SHOW_ALL,
	hidesOwnWindowTabs: true,
});
check(
	"a tab whose own window closed comes back",
	JSON.stringify(workspaceRowsOf(closedWindow)) === '["apart","here"]',
	workspaceRowsOf(closedWindow),
);

const allApart = sidebarWith(workspaceTabs("apart"), [pageOf("apart", true)], {
	hidesEmptyLists: true,
	hidesOwnWindowTabs: true,
});
check(
	"the workspace section stays even when both options empty it, so its New tab stays",
	JSON.stringify(sectionsOf(allApart)) === '["workspace:0"]',
	sectionsOf(allApart),
);

const switched = columnWithView(COLUMN_OPENED_ON, { hidesOwnWindowTabs: true });
const switchedBack = columnWithView(switched, { hidesEmptyLists: true, hidesOwnWindowTabs: undefined });
check(
	"one option switched leaves the other as it was",
	switched.hidesOwnWindowTabs &&
		!switched.hidesEmptyLists &&
		switchedBack.hidesOwnWindowTabs &&
		switchedBack.hidesEmptyLists,
	[switched, switchedBack],
);

console.log(`\nsidebar view: ${failed === 0 ? "clean" : "BLOCKED"}`);
process.exit(failed === 0 ? 0 : 1);
