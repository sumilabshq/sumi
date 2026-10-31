import { leavesOf } from "../packages/state/layout/shared/lib/pane-nodes.ts";
import { chatGroupsOf, groupedChat } from "../packages/state/layout/shared/lib/chat-groups.ts";
import { JsonMemoryPaneTreeGateway } from "../packages/state/layout/gateways/pane-tree/json-memory.gateway.ts";
import { FIRST_PANES } from "../packages/state/layout/gateways/layout-parts/memory.gateway.ts";
import { aimTargetIdsOf } from "../apps/studio/src/features/panes/lib/aim-targets.ts";
import { boardOf } from "../packages/state/layout/shared/lib/pane-trees.ts";
import {
	PlacePaneCommand,
	ClosePaneCommand,
	PlacementPreviewQuery,
} from "../packages/state/layout/features/panes/requests.ts";
import {
	OpenShownTabPaneCommand,
	ShowChatInPaneCommand,
	ShowTabInChatGroupCommand,
} from "../packages/state/layout/features/pane-tabs/requests.ts";
import { KeptPaneTreeSchema } from "../packages/state/layout/gateways/pane-tree/pane-tree.gateway.ts";
import type { LayoutParts } from "../packages/state/layout/gateways/layout-parts/layout-parts.gateway.ts";
import type { PaneNode, PanePlacement } from "../packages/state/layout/shared/schema/pane-tree.schema.ts";
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

async function placed(parts: LayoutParts, placement: PanePlacement): Promise<string | null> {
	try {
		await PlacePaneCommand.handle(placement, parts);
		return null;
	} catch (refusal: unknown) {
		return refusal instanceof Error ? refusal.message : String(refusal);
	}
}

function show(parts: LayoutParts, chatId: string): void {
	ShowChatInPaneCommand.handle({ chatId, paneId: null }, parts);
}

function paneOfTab(parts: LayoutParts, tabId: string): string {
	return (
		leavesOf(parts.paneTree.tree().root).find((leaf) => leaf.view.kind === "app" && leaf.view.tabId === tabId)?.id ?? ""
	);
}

function groupIdOf(parts: LayoutParts, chatId: string): string {
	return chatGroupsOf(parts.paneTree.tree().root).find((group) => group.chatId === chatId)?.id ?? "";
}

const quiet = console.info;
console.info = () => undefined;
const parts = partsOf();

show(parts, "chat-a");
check(
	"the chat on screen stands in a group of its own, alone on the board",
	boardShape(parts) === "group:chat-a[chat:chat-a]",
	boardShape(parts),
);

ShowTabInChatGroupCommand.handle({ chatId: "chat-a", tabId: "spec", isOnlyWhenBare: false }, parts);
check(
	"a chat tab shown with nothing of its chat on screen opens beside the chat, inside its group",
	boardShape(parts) === "group:chat-a[chat:chat-a spec]",
	boardShape(parts),
);

ShowTabInChatGroupCommand.handle({ chatId: "chat-a", tabId: "plan", isOnlyWhenBare: false }, parts);
check(
	"another chat tab replaces the chat tile shown last, no new tile",
	boardShape(parts) === "group:chat-a[chat:chat-a plan]",
	boardShape(parts),
);

ShowTabInChatGroupCommand.handle({ chatId: "chat-a", tabId: "spec", isOnlyWhenBare: true }, parts);
check(
	"following a chat leaves a group that holds tabs alone",
	boardShape(parts) === "group:chat-a[chat:chat-a plan]",
	boardShape(parts),
);

const outside = await placed(parts, {
	view: { kind: "app", tabId: "spec" },
	targetId: "pane-app",
	side: "right",
	home: "chat-a",
});
check("a chat tab is refused anywhere outside its chat's group", outside !== null, outside);
check(
	"the refused preview draws nothing",
	PlacementPreviewQuery.handle(
		{ view: { kind: "app", tabId: "spec" }, targetId: "pane-app", side: "right", home: "chat-a" },
		parts,
	) === null,
	"preview",
);

const inside = await placed(parts, {
	view: { kind: "app", tabId: "spec" },
	targetId: paneOfTab(parts, "plan"),
	side: "right",
	home: "chat-a",
});
check(
	"a chat tab dropped on its chat's tile opens beside it, joined to the group",
	inside === null && boardShape(parts) === "group:chat-a[chat:chat-a plan spec]",
	[inside, boardShape(parts)],
);

const workspaceIn = await placed(parts, {
	view: { kind: "app", tabId: "slack" },
	targetId: paneOfTab(parts, "plan"),
	side: "bottom",
	home: null,
});
check("a workspace tab is refused inside a chat's group", workspaceIn !== null, workspaceIn);

const workspaceBeside = await placed(parts, {
	view: { kind: "app", tabId: "slack" },
	targetId: groupIdOf(parts, "chat-a"),
	side: "right",
	home: null,
});
check(
	"a workspace tab dropped on a group's edge stands beside the whole group",
	workspaceBeside === null && boardShape(parts) === "row[group:chat-a[chat:chat-a plan spec] slack]",
	[workspaceBeside, boardShape(parts)],
);

const moveOut = await placed(parts, {
	view: { kind: "app", tabId: "plan" },
	targetId: "pane-app",
	side: "left",
});
check("a chat tile moved by its header cannot leave its group", moveOut !== null, moveOut);

const board = boardOf(parts.paneTree.tree());
const allPaneIds = board.leaves.map((leaf) => leaf.id);
check(
	"aiming a chat tab offers only its group's tiles",
	JSON.stringify(aimTargetIdsOf(board.chatGroups, allPaneIds, "chat-a")) ===
		JSON.stringify(board.chatGroups[0]?.paneIds),
	aimTargetIdsOf(board.chatGroups, allPaneIds, "chat-a"),
);
check(
	"aiming a workspace tab offers the free tiles and the group as a whole",
	aimTargetIdsOf(board.chatGroups, allPaneIds, null).includes(groupIdOf(parts, "chat-a")) &&
		!aimTargetIdsOf(board.chatGroups, allPaneIds, null).includes(paneOfTab(parts, "plan")),
	aimTargetIdsOf(board.chatGroups, allPaneIds, null),
);

show(parts, "chat-b");
check(
	"switching the chat replaces the whole board with that chat's tile",
	boardShape(parts) === "group:chat-b[chat:chat-b]",
	boardShape(parts),
);

show(parts, "chat-a");
check(
	"switching back brings the chat's tile back with its tabs",
	boardShape(parts) === "group:chat-a[chat:chat-a plan spec]",
	boardShape(parts),
);
check(
	"the chat left behind is kept off the board",
	shapeOf(parts.paneTree.tree().shelved?.["chat-b"] ?? null) === "group:chat-b[chat:chat-b]",
	parts.paneTree.tree().shelved,
);

const chatPane = leavesOf(parts.paneTree.tree().root).find((leaf) => leaf.view.kind === "chat")?.id ?? "";
ClosePaneCommand.handle({ id: chatPane }, parts);
check("closing the chat tile takes its whole group off the board", boardShape(parts) === "empty", boardShape(parts));

show(parts, "chat-a");
check(
	"showing the closed chat again brings its group back whole",
	boardShape(parts) === "group:chat-a[chat:chat-a plan spec]",
	boardShape(parts),
);

ClosePaneCommand.handle({ id: paneOfTab(parts, "plan") }, parts);
ClosePaneCommand.handle({ id: paneOfTab(parts, "spec") }, parts);
check(
	"a group whose tabs all closed keeps its chat alone",
	boardShape(parts) === "group:chat-a[chat:chat-a]",
	boardShape(parts),
);

OpenShownTabPaneCommand.handle(undefined, parts);
check(
	"the shown tab takes the whole board and the chat's tile goes to the shelf",
	boardShape(parts) === "shown" && parts.paneTree.tree().shelved?.["chat-a"] !== undefined,
	boardShape(parts),
);

const kept = KeptPaneTreeSchema.safeParse(parts.paneTree.tree());
check("a board with groups and a shelf passes the kept-tree checks", kept.success, kept.error?.issues);
const orphan = KeptPaneTreeSchema.safeParse({
	root: {
		kind: "split",
		id: "g",
		dir: "row",
		chatId: "chat-x",
		children: [{ kind: "pane", id: "pane-1", view: { kind: "app", tabId: "t" } }],
		shares: [1],
	},
	minted: 1,
	targetId: null,
});
check("a group without its chat tile is refused when read", !orphan.success, orphan.success);

const older = KeptPaneTreeSchema.safeParse({
	root: {
		kind: "split",
		id: "pane-root",
		dir: "row",
		children: [
			{ kind: "pane", id: "pane-1", view: { kind: "chat", chatId: "chat-a" } },
			{ kind: "pane", id: "pane-2", view: { kind: "app", tabId: null } },
		],
		shares: [0.5, 0.5],
	},
	minted: 2,
	targetId: null,
});
check(
	"a board kept before chat groups opens with each named chat in a group of its own",
	older.success && shapeOf(older.data.root) === "row[group:chat-a[chat:chat-a] shown]",
	older.success ? shapeOf(older.data.root) : older.error.issues,
);

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
	"a window never takes the active chat while another window holds it",
	shapeOf(twoWindows.tree().root) === shapeOf(FIRST_PANES.root),
	shapeOf(twoWindows.tree().root),
);

console.info = quiet;
console.log(`\nchat groups: ${failed === 0 ? "clean" : "BLOCKED"}`);
process.exit(failed === 0 ? 0 : 1);
