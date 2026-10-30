import { leavesOf } from "../packages/state/layout/shared/lib/pane-nodes.ts";
import { groupedChat } from "../packages/state/layout/shared/lib/chat-groups.ts";
import { JsonMemoryPaneTreeGateway } from "../packages/state/layout/gateways/pane-tree/json-memory.gateway.ts";
import { FIRST_PANES } from "../packages/state/layout/gateways/layout-parts/memory.gateway.ts";
import {
	OpenShownTabPaneCommand,
	ShowChatInPaneCommand,
} from "../packages/state/layout/features/pane-tabs/requests.ts";
import { KeptPaneTreeSchema } from "../packages/state/layout/gateways/pane-tree/pane-tree.gateway.ts";
import type { LayoutParts } from "../packages/state/layout/gateways/layout-parts/layout-parts.gateway.ts";
import type { PaneNode } from "../packages/state/layout/shared/schema/pane-tree.schema.ts";
import { memoryOf, partsOf } from "./layout-rules-checks.ts";

let failed = 0;

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what}${isOk ? "" : ` — saw ${JSON.stringify(got)}`}`);
}

function shapeOf(node: PaneNode | null): string {
	if (node === null) {
		return "empty";
	}

	if (node.kind === "pane") {
		return node.view.kind === "chat" ? `chat:${node.view.chatId ?? "?"}` : (node.view.tabId ?? "shown");
	}

	const inner = node.children.map(shapeOf).join(" ");
	return node.chatId === undefined ? `${node.dir}[${inner}]` : `group:${node.chatId}[${inner}]`;
}

function boardShape(parts: LayoutParts): string {
	return shapeOf(parts.paneTree.tree().root);
}

function show(parts: LayoutParts, chatId: string): void {
	ShowChatInPaneCommand.handle({ chatId, paneId: null }, parts);
}

const quiet = console.info;
console.info = () => undefined;
const parts = partsOf();

show(parts, "chat-a");
check("a chat shown takes the whole board", boardShape(parts) === "group:chat-a[chat:chat-a]", boardShape(parts));

OpenShownTabPaneCommand.handle(undefined, parts);
check("a tab shown takes the whole board, the chat leaves it", boardShape(parts) === "shown", boardShape(parts));

const shownTree = parts.paneTree.tree();
OpenShownTabPaneCommand.handle(undefined, parts);
check("showing a tab again keeps the same board", parts.paneTree.tree() === shownTree, boardShape(parts));

show(parts, "chat-b");
check(
	"another chat replaces the tab on the board",
	boardShape(parts) === "group:chat-b[chat:chat-b]",
	boardShape(parts),
);
check(
	"the chat on the board is the chat target",
	parts.paneTree.tree().chatTargetId === leavesOf(parts.paneTree.tree().root)[0]?.id,
	parts.paneTree.tree().chatTargetId,
);

show(parts, "chat-a");
check(
	"switching chats leaves one chat on the board",
	boardShape(parts) === "group:chat-a[chat:chat-a]",
	boardShape(parts),
);

const kept = KeptPaneTreeSchema.safeParse(parts.paneTree.tree());
check("a board holding one chat passes the kept-tree checks", kept.success, kept.error?.issues);

const twoWindows = new JsonMemoryPaneTreeGateway(memoryOf<unknown>(), FIRST_PANES, [
	{
		window: "studio-2",
		tree: {
			root: groupedChat({ kind: "pane", id: "pane-9", view: { kind: "chat", chatId: "chat-far" } }, "chat-far"),
			minted: 9,
			targetId: null,
		},
	},
]);
const beside = { ...partsOf(), paneTree: twoWindows };
ShowChatInPaneCommand.handle({ chatId: "chat-far", paneId: null }, beside);
check(
	"a window never takes a chat while another window holds it",
	shapeOf(twoWindows.tree().root) === shapeOf(FIRST_PANES.root),
	shapeOf(twoWindows.tree().root),
);

console.info = quiet;
console.log(`\nboard alone: ${failed === 0 ? "clean" : "BLOCKED"}`);
process.exit(failed === 0 ? 0 : 1);
