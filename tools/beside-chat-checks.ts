import { openShownPlan, placePlan, showChatPlan } from "../plugins/tabs/navigation/data/navigation/features/panes/lib/pane-plans.ts";
import { EMPTY_PANES } from "../plugins/tabs/navigation/data/navigation/shared/lib/panes/kept-panes.ts";
import { boardOf } from "../plugins/tabs/navigation/data/navigation/shared/lib/panes/pane-trees.ts";
import type { PaneTree } from "../plugins/tabs/navigation/data/navigation/shared/schema/pane-tree.schema.ts";

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

console.log(failed === 0 ? "beside chat: all checks pass" : `beside chat: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
