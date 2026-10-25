import { leavesOf } from "../packages/state/layout/shared/lib/pane-nodes.ts";
import {
	boardOf,
	isAimable,
	placedTreeOf,
	treeShowingChat,
	treeWithoutPane,
	withTarget,
} from "../packages/state/layout/shared/lib/pane-trees.ts";
import { KeptPaneTreeSchema } from "../packages/state/layout/gateways/pane-tree/pane-tree.gateway.ts";
import type { PaneTree, PaneView } from "../packages/state/layout/shared/schema/pane-tree.schema.ts";

let failed = 0;

function check(what: string, isOk: boolean, got: unknown): void {
	if (!isOk) {
		failed += 1;
	}

	console.log(`${isOk ? "ok  " : "FAIL"} ${what}${isOk ? "" : ` — saw ${JSON.stringify(got)}`}`);
}

const EMPTY: PaneTree = {
	root: null,
	minted: 0,
	targetId: null,
};

function chatOf(chatId: string): PaneView {
	return {
		kind: "chat",
		chatId,
	};
}

function placed(tree: PaneTree, view: PaneView, targetId: string | null): PaneTree {
	return placedTreeOf(tree, view, { targetId, side: "right" })?.tree ?? tree;
}

function chatsShown(tree: PaneTree): readonly string[] {
	return leavesOf(tree.root).flatMap((leaf) => (leaf.view.kind === "chat" ? [`${leaf.id}:${leaf.view.chatId}`] : []));
}

const one = placed(EMPTY, chatOf("hi"), null);
const two = placed(one, chatOf("chat-2"), "pane-1");
check(
	"a second chat dropped on the board opens a pane of its own beside the first",
	JSON.stringify(chatsShown(two)) === '["pane-1:hi","pane-2:chat-2"]',
	chatsShown(two),
);
check("the chat just placed is the active chat pane", boardOf(two).chatTargetId === "pane-2", boardOf(two));

const moved = placedTreeOf(two, chatOf("hi"), { targetId: "pane-2", side: "left" });
check(
	"dropping a chat that stands already moves its pane, no copy",
	moved !== null && moved.placedId === "pane-1" && chatsShown(moved.tree).length === 2,
	moved,
);

const aimedFirst = withTarget(two, "pane-1", "chat");
check(
	"pressing a chat pane aims it as the active chat pane and leaves the browser target alone",
	aimedFirst.chatTargetId === "pane-1" && aimedFirst.targetId === null && !isAimable(aimedFirst, "pane-1"),
	aimedFirst,
);

const replaced = treeShowingChat(aimedFirst, "third", null);
check(
	"choosing a chat in the sidebar replaces the chat in the active chat pane only",
	JSON.stringify(chatsShown(replaced)) === '["pane-3:third","pane-2:chat-2"]',
	chatsShown(replaced),
);

const focusedChats = [boardOf(aimedFirst).focusedChatId, boardOf(two).focusedChatId];
check(
	"the window's chat is the chat of its pressed chat pane",
	JSON.stringify(focusedChats) === '["hi","chat-2"]',
	focusedChats,
);

const aimedStanding = treeShowingChat(aimedFirst, "chat-2", null);
check(
	"choosing a chat that stands in a pane aims that pane instead of copying it",
	aimedStanding.chatTargetId === "pane-2" && chatsShown(aimedStanding).length === 2,
	[aimedStanding.chatTargetId, chatsShown(aimedStanding)],
);

const opened = treeShowingChat(EMPTY, "lonely", null);
check(
	"choosing a chat with no chat pane on the board opens one",
	JSON.stringify(chatsShown(opened)) === '["pane-1:lonely"]',
	chatsShown(opened),
);

const closed = treeWithoutPane(aimedFirst, "pane-1");
check(
	"closing the active chat pane hands the role to the chat pane left",
	closed.chatTargetId === undefined && boardOf(closed).chatTargetId === "pane-2",
	[closed.chatTargetId, boardOf(closed).chatTargetId],
);

const oldTree = KeptPaneTreeSchema.safeParse({
	root: { kind: "pane", id: "pane-1", view: { kind: "chat" } },
	minted: 1,
	targetId: null,
});
check(
	"a board saved before chats had ids still opens, its chat pane unnamed",
	oldTree.success && oldTree.data.root?.kind === "pane" && oldTree.data.root.view.kind === "chat",
	oldTree,
);

console.log(`\nchat panes: ${failed === 0 ? "clean" : "BLOCKED"}`);
process.exit(failed === 0 ? 0 : 1);
