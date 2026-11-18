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

function chatWithTabs(): {
	readonly moment: HostTabsMoment;
	readonly chatId: string;
	readonly pageId: string;
	readonly otherChatId: string;
} {
	const chat = openTab(emptyMoment(BUILT_IN_APPS), { app: "chat", pageId: null }, atEnd(WORKSPACE_LIST));
	const page = openTab(chat.moment, { app: "browser", pageId: null }, atEnd(WORKSPACE_LIST));
	const other = openTab(page.moment, { app: "chat", pageId: null }, atEnd(WORKSPACE_LIST));
	return { moment: other.moment, chatId: chat.tab.id, pageId: page.tab.id, otherChatId: other.tab.id };
}

const start = chatWithTabs();
const held = placeTab(start.moment, start.pageId, atEnd(start.chatId))?.moment ?? start.moment;

check("a page placed into a chat breaks no law", tabBreaksOf(held), []);
check("the chat's list holds the page", flatTabIdsOf(held, start.chatId), [start.pageId]);
check("the page left the workspace list", flatTabIdsOf(held, WORKSPACE_LIST), [start.chatId, start.otherChatId]);
check(
	"a chat may not stand inside a chat",
	refuseStanding(
		held,
		held.tabs.find((tab) => tab.id === start.otherChatId) ?? { id: "", app: "chat" },
		start.chatId,
	)?.endsWith("A chat can't hold a chat"),
	true,
);

const chatInChat = placeTab(held, start.otherChatId, atEnd(start.chatId))?.moment ?? held;
check(
	"a chat inside a chat breaks the law",
	tabBreaksOf(chatInChat).some((broken) => broken.endsWith("A chat can't hold a chat")),
	true,
);

const sidebar = sidebarOf({ moment: held, pages: [], highlightedIds: new Set(), elsewhere: [] });
const chatRow = sidebar.sections[0]?.entries.find((entry) => entry.kind === "tab" && entry.tab.id === start.chatId);
check(
	"the sidebar shows the page under its chat, unfolded",
	chatRow?.kind === "tab" ? [chatRow.artifacts?.map((artifact) => artifact.tab.id), chatRow.isFolded] : null,
	[[start.pageId], false],
);
const artifactsOf = (found: ReturnType<typeof sidebarOf>, id: string) => {
	const entry = found.sections[0]?.entries.find((one) => one.kind === "tab" && one.tab.id === id);
	return entry?.kind === "tab" ? entry.artifacts : "missing";
};
check("an empty chat carries an empty artifact list", artifactsOf(sidebar, start.otherChatId), []);
check(
	"a page carries no artifact list",
	artifactsOf(sidebarOf({ moment: start.moment, pages: [], highlightedIds: new Set(), elsewhere: [] }), start.pageId),
	undefined,
);

const grouped = addGroup(held, { chatId: WORKSPACE_LIST, withTabId: start.otherChatId, inGroupId: null }).moment;
const groupId = grouped.groups[0]?.id ?? "";
const groupPlaced = placeGroupPlan(groupId, { list: start.chatId, groupId: null, before: null })(grouped);
check(
	"a group placed into a chat is refused",
	"refusal" in groupPlaced ? groupPlaced.refusal : null,
	"A chat can't hold a group",
);

const closed = closeTabs(held, new Map(), { ids: [start.chatId], reason: "check" }).moment;
check(
	"closing a chat closes its artifacts",
	closed.tabs.map((tab) => tab.id),
	[start.otherChatId],
);
check("closing a chat drops its list", Object.keys(closed.lists).includes(start.chatId), false);
check("closing a chat breaks no law", tabBreaksOf(closed), []);

console.log(failed === 0 ? "chat artifacts: all checks pass" : `chat artifacts: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
