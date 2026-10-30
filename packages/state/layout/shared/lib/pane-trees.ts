import type {
	PaneBoard,
	PaneLeaf,
	PaneNode,
	PaneTree,
	PaneView,
	PlacementPreview,
} from "../schema/pane-tree.schema.js";
import { idsOf, isSameView, leavesOf, withNodeReplaced, withPlaced, withView, withoutPane } from "./pane-nodes.js";
import { chatGroupsOf, chatLeafOf, groupHolding, groupedChat } from "./chat-groups.js";
import { holdsOf } from "./window-trees.js";
import type { WindowTree } from "./window-trees.js";
import type { PanePlace } from "./pane-nodes.js";

export interface PlacedTree {
	readonly tree: PaneTree;
	readonly placedId: string;
}

export interface TabPane {
	readonly paneId: string;
	readonly tabId: string;
}

const NO_PANE = 'no pane "{id}" stands on the board';
export function refuseUnknownPane(tree: PaneTree, id: string | null): string | null {
	const groupIds = chatGroupsOf(tree.root).map((group) => group.id);

	if (id === null || groupIds.includes(id) || leavesOf(tree.root).some((leaf) => leaf.id === id)) {
		return null;
	}

	return NO_PANE.replace("{id}", id);
}

export function boardOf(tree: PaneTree, others: readonly WindowTree[] = []): PaneBoard {
	const chatTarget = chatPaneOf(tree);
	return {
		root: tree.root,
		targetId: tree.targetId,
		chatTargetId: chatTarget?.id ?? null,
		focusedChatId: chatTarget?.view.kind === "chat" ? (chatTarget.view.chatId ?? null) : null,
		isLoaded: true,
		tabTargetId: tabTargetOf(tree)?.paneId ?? null,
		leaves: leavesOf(tree.root),
		tabPanes: tabPanesOf(tree),
		chatGroups: chatGroupsOf(tree.root).map((group) => ({
			chatId: group.chatId,
			groupId: group.id,
			paneIds: leavesOf(group).map((leaf) => leaf.id),
		})),
		elsewhere: holdsOf(others),
	};
}

export function mintedLeafOf(tree: PaneTree, view: PaneView): PaneLeaf {
	return {
		kind: "pane",
		id: `pane-${tree.minted + 1}`,
		view,
	};
}

export function placedTreeOf(tree: PaneTree, view: PaneView, at: PanePlace): PlacedTree | null {
	const standing = leavesOf(tree.root).find((leaf) => isSameView(leaf.view, view));
	const moved = standing === undefined ? arrivingNodeOf(tree, view) : movedNodeOf(tree.root, standing);
	const root = withPlaced(tree.root, view.kind === "chat" ? outerPlaceOf(tree, at) : at, moved);

	if (root === null) {
		return null;
	}

	const placedId = standing?.id ?? (chatLeafOf(moved) ?? mintedLeafOf(tree, view)).id;
	const placed = {
		...tree,
		root,
		minted: standing === undefined ? tree.minted + 1 : tree.minted,
		...shelfWithout(tree, view.kind === "chat" ? view.chatId : undefined),
	};
	return {
		tree: withTarget(placed, placedId, view.kind),
		placedId,
	};
}

export function placementPreviewOf(tree: PaneTree, view: PaneView, at: PanePlace): PlacementPreview | null {
	const placed = placedTreeOf(tree, view, at);

	if (placed !== null) {
		return {
			root: placed.tree.root,
			placedId: placed.placedId,
		};
	}

	const standing = leavesOf(tree.root).find((leaf) => isSameView(leaf.view, view));
	return standing === undefined || standing.id !== at.targetId ? null : { root: tree.root, placedId: standing.id };
}

export function isAimable(tree: PaneTree, id: string): boolean {
	const leaf = leavesOf(tree.root).find((one) => one.id === id);

	if (leaf?.view.kind === "chat") {
		return tree.chatTargetId !== id;
	}

	return leaf?.view.kind === "app" && tree.targetId !== id;
}

export function withTarget(tree: PaneTree, id: string, kind: PaneView["kind"]): PaneTree {
	if (kind === "chat") {
		return withChatTarget(tree, id);
	}

	return {
		...tree,
		targetId: id,
	};
}

export function treeWithoutPane(tree: PaneTree, id: string): PaneTree {
	const leaf = leavesOf(tree.root).find((one) => one.id === id);
	const group = leaf?.view.kind === "chat" ? groupHolding(tree.root, id) : null;
	const gone = group ?? leaf;
	const goneIds = gone === undefined ? [id] : idsOf(gone);
	const left = {
		...tree,
		root: withoutPane(tree.root, gone?.id ?? id),
		targetId: tree.targetId !== null && goneIds.includes(tree.targetId) ? null : tree.targetId,
		...(group === null ? {} : shelfWith(tree, group.chatId, group)),
	};
	return tree.chatTargetId !== undefined && goneIds.includes(tree.chatTargetId) ? withChatTarget(left, null) : left;
}

export function treeShowingChat(tree: PaneTree, chatId: string, paneId: string | null): PaneTree {
	const standing = paneShowingChat(tree, chatId);

	if (standing !== null) {
		const grouped = withChatGrouped(tree, standing, chatId);
		return grouped.chatTargetId === standing.id ? grouped : withChatTarget(grouped, standing.id);
	}

	const waitingChatLeaf = leavesOf(tree.root).find((leaf) => leaf.id === paneId && leaf.view.kind === "chat");
	return treeHoldingChatAlone(tree, chatId, waitingChatLeaf ?? null);
}

export function treeShowingShownTabAlone(tree: PaneTree): PaneTree {
	const standingShownTabLeaf = shownTabPaneOf(tree);
	const leaf = standingShownTabLeaf ?? mintedLeafOf(tree, { kind: "app", tabId: null });
	return {
		...withChatTarget(tree, null),
		root: leaf,
		targetId: leaf.id,
		minted: standingShownTabLeaf === null ? tree.minted + 1 : tree.minted,
	};
}

export function paneShowingChat(tree: PaneTree, chatId: string): PaneLeaf | null {
	return leavesOf(tree.root).find((leaf) => leaf.view.kind === "chat" && leaf.view.chatId === chatId) ?? null;
}

export function treeWithoutPanes(tree: PaneTree, ids: readonly string[]): PaneTree {
	return ids.reduce(treeWithoutPane, tree);
}

export function withTabShown(tree: PaneTree, paneId: string, tabId: string | null): PaneTree {
	return {
		...tree,
		root: withView(tree.root, paneId, {
			kind: "app",
			tabId,
		}),
	};
}

export function paneShowingTab(tree: PaneTree, tabId: string): string | null {
	return tabPanesOf(tree).find((pane) => pane.tabId === tabId)?.paneId ?? null;
}

export function tabTargetOf(tree: PaneTree): TabPane | null {
	const target = leavesOf(tree.root).find((leaf) => leaf.id === tree.targetId);

	if (target?.view.kind !== "app" || target.view.tabId === null || groupHolding(tree.root, target.id) !== null) {
		return null;
	}

	return {
		paneId: target.id,
		tabId: target.view.tabId,
	};
}

export function shownTabPaneOf(tree: PaneTree): PaneLeaf | null {
	return leavesOf(tree.root).find((leaf) => leaf.view.kind === "app" && leaf.view.tabId === null) ?? null;
}

export function tabPaneIdsOf(tree: PaneTree, tabIds: readonly string[]): string[] {
	return tabPanesOf(tree)
		.filter(({ tabId }) => tabIds.includes(tabId))
		.map(({ paneId }) => paneId);
}

export function goneTabPanesOf(tree: PaneTree, heldTabIds: ReadonlySet<string>): TabPane[] {
	return tabPanesOf(tree).filter(({ tabId }) => !heldTabIds.has(tabId));
}

export function treeWithoutGoneTabs(tree: PaneTree, gonePanes: readonly TabPane[]): PaneTree {
	return gonePanes.reduce((left, { paneId }) => treeWithoutGoneTab(left, paneId), tree);
}

function treeHoldingChatAlone(tree: PaneTree, chatId: string, waitingChatLeaf: PaneLeaf | null): PaneTree {
	const leaf = waitingChatLeaf ?? mintedLeafOf(tree, { kind: "chat", chatId });
	const alone = {
		...tree,
		...shelfWithout(tree, chatId),
		root: groupedChat(leaf, chatId),
		targetId: null,
		minted: waitingChatLeaf === null ? tree.minted + 1 : tree.minted,
	};
	return withChatTarget(alone, leaf.id);
}

function chatPaneOf(tree: PaneTree): PaneLeaf | null {
	const chats = leavesOf(tree.root).filter((leaf) => leaf.view.kind === "chat");
	return chats.find((leaf) => leaf.id === tree.chatTargetId) ?? chats[0] ?? null;
}

function outerIdOf(tree: PaneTree, id: string): string {
	return groupHolding(tree.root, id)?.id ?? id;
}

function outerPlaceOf(tree: PaneTree, at: PanePlace): PanePlace {
	return at.targetId === null ? at : { ...at, targetId: outerIdOf(tree, at.targetId) };
}

function arrivingNodeOf(tree: PaneTree, view: PaneView): PaneNode {
	const minted = mintedLeafOf(tree, view);

	if (view.kind !== "chat" || view.chatId === undefined) {
		return minted;
	}

	return tree.shelved?.[view.chatId] ?? groupedChat(minted, view.chatId);
}

function movedNodeOf(root: PaneNode | null, standing: PaneLeaf): PaneNode {
	return standing.view.kind === "chat" ? (groupHolding(root, standing.id) ?? standing) : standing;
}

function shelfWithout(tree: PaneTree, chatId: string | undefined): Pick<PaneTree, "shelved"> {
	if (chatId === undefined || tree.shelved?.[chatId] === undefined) {
		return tree.shelved === undefined ? {} : { shelved: tree.shelved };
	}

	const { [chatId]: _taken, ...left } = tree.shelved;
	return { shelved: left };
}

function shelfWith(tree: PaneTree, chatId: string, node: PaneNode): Pick<PaneTree, "shelved"> {
	return {
		shelved: {
			...tree.shelved,
			[chatId]: node,
		},
	};
}

function withChatGrouped(tree: PaneTree, leaf: PaneLeaf, chatId: string): PaneTree {
	if (groupHolding(tree.root, leaf.id) !== null) {
		return tree;
	}

	return {
		...tree,
		root: withNodeReplaced(tree.root, leaf.id, groupedChat(leaf, chatId)),
	};
}

function withChatTarget({ chatTargetId: _was, ...tree }: PaneTree, id: string | null): PaneTree {
	return id === null ? tree : { ...tree, chatTargetId: id };
}

function treeWithoutGoneTab(tree: PaneTree, paneId: string): PaneTree {
	const appPanes = leavesOf(tree.root).filter((leaf) => leaf.view.kind === "app");

	if (appPanes.length > 1) {
		return treeWithoutPane(tree, paneId);
	}

	return withTabShown(tree, paneId, null);
}

function tabPanesOf(tree: PaneTree): TabPane[] {
	return leavesOf(tree.root).flatMap((leaf) =>
		leaf.view.kind === "app" && leaf.view.tabId !== null
			? [
					{
						paneId: leaf.id,
						tabId: leaf.view.tabId,
					},
				]
			: [],
	);
}
