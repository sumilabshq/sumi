import { openShownPlan, placePlan, showChatPlan } from "../plugins/tabs/navigation/data/navigation/features/panes/lib/pane-plans.ts";
import { EMPTY_PANES } from "../plugins/tabs/navigation/data/navigation/shared/lib/panes/kept-panes.ts";
import { boardOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/panes/pane-trees.ts";
import type { PaneBoard, PaneTree } from "../plugins/tabs/navigation/data/navigation/shared/schema/pane-tree.schema.ts";
import { withShownTab } from "../plugins/tabs/navigation/data/navigation/shared/lib/showing/tab-shown.ts";
import type { TabFacts } from "../plugins/tabs/navigation/data/navigation/shared/lib/showing/tab-facts.ts";
import { emptyMoment, openTab, placeTab } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/host-tabs.ts";
import { WORKSPACE_LIST } from "../plugins/tabs/navigation/data/navigation/shared/lib/tabs/tab-lists.ts";
import { BUILT_IN_APPS } from "./placed-apps-fixture.ts";

let failed = 0;
console.info = () => undefined;

function check(name: string, seen: unknown, wanted: unknown): void {
	const isOk = JSON.stringify(seen) === JSON.stringify(wanted);
	failed += isOk ? 0 : 1;
	console.log(`${isOk ? "ok  " : "FAIL"} ${name}${isOk ? "" : ` — saw ${JSON.stringify(seen)}, wanted ${JSON.stringify(wanted)}`}`);
}

const after = (tree: PaneTree, change: { readonly next: PaneTree | null }): PaneTree => change.next ?? tree;
const viewsOf = (tree: PaneTree) =>
	boardOf(tree).leaves.map(({ view }) => (view.kind === "chat" ? `chat:${view.chatId ?? ""}` : `app:${view.tabId ?? "shown"}`));

const tabAlone = after(EMPTY_PANES, openShownPlan()(EMPTY_PANES, []));
check("the shown tab takes the whole board", viewsOf(tabAlone), ["app:shown"]);

const chatShown = after(tabAlone, showChatPlan("chat-1", null)(tabAlone, []));
const chatPane = boardOf(chatShown).leaves.find(({ view }) => view.kind === "chat");
const placed = placePlan({ view: { kind: "app", tabId: "canvas-1" }, targetId: chatPane?.id ?? null, side: "left", home: "chat-1" });
const beside = placed(chatShown, []);
check("the canvas is placed into the chat's group without a refusal", beside.refusal, null);
check("the board shows the canvas left of its chat", viewsOf(after(chatShown, beside)), ["app:canvas-1", "chat:chat-1"]);

const rightOf = placePlan({ view: { kind: "app", tabId: "plan-1" }, targetId: chatPane?.id ?? null, side: "right", home: "chat-1" })(chatShown, []);
check("a chat's sub-page stands right of the chat", viewsOf(after(chatShown, rightOf)), ["chat:chat-1", "app:plan-1"]);

const atEnd = (list: string) => ({ chatId: list, groupId: null, before: null });
const mainChat = openTab(emptyMoment(BUILT_IN_APPS), { app: "chat", pageId: null }, atEnd(WORKSPACE_LIST));
const subChat = openTab(mainChat.moment, { app: "chat", pageId: null }, atEnd(WORKSPACE_LIST));
const plan = openTab(subChat.moment, { app: "canvas", pageId: null }, atEnd(WORKSPACE_LIST));
const withSubChat = placeTab(plan.moment, subChat.tab.id, atEnd(mainChat.tab.id))?.moment ?? plan.moment;
const [mainId, subId, planId] = [mainChat.tab.id, subChat.tab.id, plan.tab.id];
const NO_FACTS: TabFacts = {
	pages: [],
	isBrowserAvailable: true,
	canOpenOwnWindow: false,
	tabPanes: [],
	shownTabPaneId: null,
	hasTabTarget: false,
	tabTargetId: null,
	chatGroupIds: [],
	tabWindows: new Map(),
};
const subChatShown = withShownTab({ moment: withSubChat, effects: [], reasons: [] }, NO_FACTS, {
	tab: withSubChat.tabs.find((tab) => tab.id === subId) ?? subChat.tab,
	paneId: null,
});
check(
	"a sub-page chat shows its main chat as a chat, never as an app pane",
	subChatShown.effects.filter((effect) => effect.kind !== "show-chat"),
	[{ kind: "show-chat-beside-chat", chatId: mainId, besideChatId: subId }],
);

const mainShown = after(EMPTY_PANES, showChatPlan(mainId, null)(EMPTY_PANES, []));
const mainGroup = boardOf(mainShown).chatGroups[0]?.groupId ?? null;
const subPlaced = placePlan({ view: { kind: "chat", chatId: subId }, targetId: mainGroup, side: "right", home: null })(mainShown, []);
const twoChats = after(mainShown, subPlaced);
check("a sub-page chat is placed beside its main chat without a refusal", subPlaced.refusal, null);
check("the main chat stands left, its sub-page chat right", viewsOf(twoChats), [`chat:${mainId}`, `chat:${subId}`]);
const twoChatsBoard = boardOf(twoChats, [], withSubChat);
const paneOfChat = (board: PaneBoard, chatId: string) =>
	board.leaves.find(({ view }) => view.kind === "chat" && view.chatId === chatId)?.id;
check("the sub-page chat is the active chat pane", twoChatsBoard.chatTargetId, paneOfChat(twoChatsBoard, subId));
check("only the sub-page chat can be hidden or expanded", twoChatsBoard.hidableIds, [paneOfChat(twoChatsBoard, subId)]);

const planBeside = placePlan({ view: { kind: "app", tabId: planId }, targetId: boardOf(mainShown).leaves[0]?.id ?? null, side: "right", home: mainId })(mainShown, []);
const chatWithTab = boardOf(after(mainShown, planBeside), [], withSubChat);
check(
	"a workspace tab beside a chat can be hidden, the chat can't",
	chatWithTab.hidableIds,
	chatWithTab.leaves.filter(({ view }) => view.kind === "app").map(({ id }) => id),
);

console.log(failed === 0 ? "beside chat: all checks pass" : `beside chat: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
