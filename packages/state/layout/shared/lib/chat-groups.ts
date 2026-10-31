import type { PaneLeaf, PaneNode, PaneTree, PaneView } from "../schema/pane-tree.schema.js";
import { idsOf, isChatGroup, isSameView, leavesOf } from "./pane-nodes.js";
import type { ChatGroup } from "./pane-nodes.js";

const NOT_ON_BOARD = 'chat "{chat}" has no group on the board';
const OUTSIDE_GROUP = '"{target}" stands outside the group of chat "{chat}"';
const INSIDE_GROUP =
	'"{target}" stands inside the group of chat "{chat}", and a workspace tab stands outside every chat';

export function chatGroupsOf(node: PaneNode | null): readonly ChatGroup[] {
	if (node === null || node.kind === "pane") {
		return [];
	}

	return isChatGroup(node) ? [node] : node.children.flatMap((child) => chatGroupsOf(child));
}

export function groupOfChat(node: PaneNode | null, chatId: string): ChatGroup | null {
	return chatGroupsOf(node).find((group) => group.chatId === chatId) ?? null;
}

export function groupHolding(node: PaneNode | null, id: string): ChatGroup | null {
	return chatGroupsOf(node).find((group) => group.id !== id && idsOf(group).includes(id)) ?? null;
}

export function groupedChat(leaf: PaneLeaf, chatId: string): ChatGroup {
	return {
		kind: "split",
		id: `${leaf.id}-group`,
		dir: "row",
		children: [
			{
				...leaf,
				view: {
					kind: "chat",
					chatId,
				},
			},
		],
		shares: [1],
		chatId,
	};
}

export function chatLeafOf(node: PaneNode): PaneLeaf | null {
	return leavesOf(node).find((leaf) => leaf.view.kind === "chat") ?? null;
}

export function homeOfPlacement(root: PaneNode | null, view: PaneView, home: string | null | undefined): string | null {
	if (view.kind === "chat") {
		return null;
	}

	if (home !== undefined) {
		return home;
	}

	const standing = leavesOf(root).find((leaf) => isSameView(leaf.view, view));
	return standing === undefined ? null : (groupHolding(root, standing.id)?.chatId ?? null);
}

export function refuseHomeTarget(root: PaneNode | null, home: string | null, targetId: string | null): string | null {
	if (home === null) {
		const holding = targetId === null ? null : groupHolding(root, targetId);
		return holding === null ? null : INSIDE_GROUP.replace("{target}", targetId ?? "").replace("{chat}", holding.chatId);
	}

	const group = groupOfChat(root, home);

	if (group === null) {
		return NOT_ON_BOARD.replace("{chat}", home);
	}

	if (targetId !== null && groupHolding(root, targetId)?.id === group.id) {
		return null;
	}

	return OUTSIDE_GROUP.replace("{target}", targetId ?? "the board").replace("{chat}", home);
}

export function withChatsGrouped(tree: PaneTree): PaneTree {
	return tree.root === null
		? tree
		: {
				...tree,
				root: looseChatsGrouped(tree.root),
			};
}

function looseChatsGrouped(node: PaneNode): PaneNode {
	if (node.kind === "pane") {
		return node.view.kind === "chat" && node.view.chatId !== undefined ? groupedChat(node, node.view.chatId) : node;
	}

	if (isChatGroup(node)) {
		return node;
	}

	return {
		...node,
		children: node.children.map(looseChatsGrouped),
	};
}
