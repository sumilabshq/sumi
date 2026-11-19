import { BUILT_IN_APPS } from "./placed-apps-fixture.ts";
import {
	emptyMoment,
	openTab,
	placeTab,
} from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/host-tabs.ts";
import type { HostTabsMoment } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/host-tabs.ts";
import { closeTabs } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-closing.ts";
import { WORKSPACE_LIST, flatTabIdsOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-lists.ts";
import {
	refuseStanding,
	tabBreaksOf,
} from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-invariants.ts";
import { sidebarOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/rows/sidebar-rows.ts";
import { addGroup } from "../plugins/tabs/tab-groups/data/tab-groups/shared/lib/tab-groups.ts";
import { placeGroupPlan } from "../plugins/tabs/tab-groups/data/tab-groups/features/groups/lib/group-plans.ts";

let failed = 0;
console.info = () => undefined;

function check(name: string, seen: unknown, wanted: unknown): void {
	const isOk = JSON.stringify(seen) === JSON.stringify(wanted);
	failed += isOk ? 0 : 1;
	console.log(
		`${isOk ? "ok  " : "FAIL"} ${name}${isOk ? "" : ` — saw ${JSON.stringify(seen)}, wanted ${JSON.stringify(wanted)}`}`,
	);
}

const atEnd = (list: string) => ({ chatId: list, groupId: null, before: null });
const said = (moment: HostTabsMoment, id: string, list: string): string | null => {
	const tab = moment.tabs.find((one) => one.id === id);
	return tab === undefined ? "no tab" : refuseStanding(moment, tab, list);
};
const placed = (moment: HostTabsMoment, id: string, list: string): HostTabsMoment =>
	placeTab(moment, id, atEnd(list))?.moment ?? moment;
const endsWith = (seen: string | null, words: string): boolean => seen?.endsWith(words) ?? false;

const chat = openTab(emptyMoment(BUILT_IN_APPS), { app: "chat", pageId: null }, atEnd(WORKSPACE_LIST));
const page = openTab(chat.moment, { app: "browser", pageId: null }, atEnd(WORKSPACE_LIST));
const canvas = openTab(page.moment, { app: "canvas", pageId: null }, atEnd(WORKSPACE_LIST));
const other = openTab(canvas.moment, { app: "chat", pageId: null }, atEnd(WORKSPACE_LIST));
const start = other.moment;
const [chatId, pageId, canvasId, otherId] = [chat.tab.id, page.tab.id, canvas.tab.id, other.tab.id];

const underChat = placed(start, pageId, chatId);
check("a page placed under a chat breaks no law", tabBreaksOf(underChat), []);
check("the chat's list holds the page", flatTabIdsOf(underChat, chatId), [pageId]);
check("the page left the workspace list", flatTabIdsOf(underChat, WORKSPACE_LIST), [chatId, canvasId, otherId]);

const chatUnderPage = placed(start, otherId, pageId);
check("a chat placed under a browser page breaks no law: the AI assistant of the page", tabBreaksOf(chatUnderPage), []);
check(
	"any main page holds sub-pages: a canvas under a canvas-free page",
	tabBreaksOf(placed(start, canvasId, pageId)),
	[],
);

check(
	"a sub-page holds no sub-pages",
	endsWith(said(underChat, canvasId, pageId), "A sub-page can't hold sub-pages"),
	true,
);
check(
	"a page with sub-pages can't become a sub-page",
	endsWith(said(underChat, chatId, otherId), "A page with sub-pages can't be a sub-page"),
	true,
);
check("a page can't hold itself", said(start, pageId, pageId) !== null, true);
check(
	"a sub-page placed under a sub-page breaks the law",
	tabBreaksOf(placed(underChat, canvasId, pageId)).some((broken) => broken.endsWith("A sub-page can't hold sub-pages")),
	true,
);

const sidebar = sidebarOf({ moment: underChat, pages: [], highlightedIds: new Set(), elsewhere: [] });
const subPagesOf = (id: string) => {
	const entry = sidebar.sections[0]?.entries.find((one) => one.kind === "tab" && one.tab.id === id);
	return entry?.kind === "tab" ? entry.subPages?.map(({ tab }) => tab.id) : "missing";
};
check("the sidebar shows the page under its chat", subPagesOf(chatId), [pageId]);
check("every main page carries a sub-page list, even an empty one", subPagesOf(canvasId), []);

const grouped = addGroup(underChat, { chatId: WORKSPACE_LIST, withTabId: otherId, inGroupId: null }).moment;
const groupPlaced = placeGroupPlan(grouped.groups[0]?.id ?? "", { list: chatId, groupId: null, before: null })(grouped);
check(
	"a group placed under a page is refused",
	"refusal" in groupPlaced ? groupPlaced.refusal : null,
	"A page can't hold a group",
);

const closed = closeTabs(underChat, new Map(), { ids: [chatId], reason: "check" }).moment;
check(
	"closing a main page closes its sub-pages",
	closed.tabs.map((tab) => tab.id),
	[canvasId, otherId],
);
check(
	"closing a main page drops its list and breaks no law",
	[Object.keys(closed.lists).includes(chatId), tabBreaksOf(closed)],
	[false, []],
);

const out = placed(underChat, pageId, WORKSPACE_LIST);
check("a sub-page taken out leaves an empty list that breaks no law", tabBreaksOf(placed(out, chatId, otherId)), []);

console.log(failed === 0 ? "sub-pages: all checks pass" : `sub-pages: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
