import type { PaneLeaf, PaneNode, PaneTree, SplitDrawing, SplitDrawnNode } from "../schema/pane-tree.schema.js";
import { chatGroupsOf, chatLeafOf, groupedChat } from "./chat-groups.js";
import { leavesOf } from "./pane-nodes.js";
import type { ChatGroup } from "./pane-nodes.js";

export function treeShowingSplit(tree: PaneTree, drawing: SplitDrawing): PaneTree {
	const groups = keptGroupsOf(tree);
	const root = drawnNodeOf(drawing.layout, { drawing, groups });
	const usedChatIds = new Set(drawing.chatIds);
	const { chatTargetId: _was, ...rest } = tree;
	const chatTarget = focusedChatLeafOf(root, drawing);
	return {
		...rest,
		root,
		shelved: Object.fromEntries([...groups].filter(([chatId]) => !usedChatIds.has(chatId))),
		targetId: focusedAppPaneOf(root, drawing),
		...(chatTarget === null ? {} : { chatTargetId: chatTarget }),
	};
}

export function treeLeavingSplit(tree: PaneTree): PaneTree {
	const { chatTargetId: _was, ...rest } = tree;
	return {
		...rest,
		root: null,
		targetId: null,
		shelved: Object.fromEntries(keptGroupsOf(tree)),
	};
}

const SPLIT_PANE_PREFIX = "pane-split-";

interface Drawing {
	readonly drawing: SplitDrawing;
	readonly groups: ReadonlyMap<string, PaneNode>;
}

function keptGroupsOf(tree: PaneTree): ReadonlyMap<string, PaneNode> {
	const onBoard = chatGroupsOf(tree.root).map((group: ChatGroup) => [group.chatId, group] as const);
	return new Map([...Object.entries(tree.shelved ?? {}), ...onBoard]);
}

function drawnNodeOf(node: SplitDrawnNode, drawn: Drawing): PaneNode {
	if (node.kind === "branch") {
		return {
			kind: "split",
			id: splitPaneIdOf(node.id),
			dir: node.dir,
			children: node.children.map((child) => drawnNodeOf(child, drawn)),
			shares: node.shares,
		};
	}

	return drawn.drawing.chatIds.includes(node.tabId) ? chatStageOf(node.tabId, drawn) : appPaneOf(node.tabId);
}

function appPaneOf(tabId: string): PaneLeaf {
	return {
		kind: "pane",
		id: splitPaneIdOf(tabId),
		view: { kind: "app", tabId },
	};
}

function chatStageOf(chatId: string, { groups }: Drawing): PaneNode {
	const chatLeaf: PaneLeaf = { kind: "pane", id: splitPaneIdOf(chatId), view: { kind: "chat", chatId } };
	return groups.get(chatId) ?? groupedChat(chatLeaf, chatId);
}

function splitPaneIdOf(id: string): string {
	return `${SPLIT_PANE_PREFIX}${id}`;
}

function focusedAppPaneOf(root: PaneNode, { focusedId }: SplitDrawing): string | null {
	const apps = leavesOf(root).filter((leaf) => leaf.view.kind === "app");
	const focused = apps.find((leaf) => leaf.view.kind === "app" && leaf.view.tabId === focusedId);
	return (focused ?? apps[0])?.id ?? null;
}

function focusedChatLeafOf(root: PaneNode, { focusedId }: SplitDrawing): string | null {
	const chats = chatGroupsOf(root);
	const focused = chats.find((group) => group.chatId === focusedId) ?? chats[0];
	return focused === undefined ? null : (chatLeafOf(focused)?.id ?? null);
}
