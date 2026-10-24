import type { PaneBoard, PaneLeaf, PaneNode, PaneSplit, PaneTree, PaneView } from "../schema/pane-tree.schema.js";
import { isSameView, leavesOf, withPlaced, withShare, withView, withoutPane } from "./pane-nodes.js";
import type { PanePlace } from "./pane-nodes.js";

export interface PlacedTree {
	readonly tree: PaneTree;
	readonly placedId: string;
}

export interface TabPane {
	readonly paneId: string;
	readonly tabId: string;
}

export interface SplitShare {
	readonly splitId: string;
	readonly at: number;
	readonly share: number;
}

const NO_PANE = 'no pane "{id}" stands on the board';
const NO_SPLIT = 'no split "{id}" stands on the board';
const NO_EDGE = 'split "{id}" has no edge at {at}';

export function refuseUnknownPane(tree: PaneTree, id: string | null): string | null {
	if (id === null || leavesOf(tree.root).some((leaf) => leaf.id === id)) {
		return null;
	}

	return NO_PANE.replace("{id}", id);
}

export function refuseUnknownEdge(tree: PaneTree, { splitId, at }: SplitShare): string | null {
	const split = splitOf(tree.root, splitId);

	if (split === null) {
		return NO_SPLIT.replace("{id}", splitId);
	}

	return at + 1 < split.children.length ? null : NO_EDGE.replace("{id}", splitId).replace("{at}", String(at));
}

export function boardOf(tree: PaneTree): PaneBoard {
	return {
		root: tree.root,
		targetId: tree.targetId,
		tabTargetId: tabTargetOf(tree)?.paneId ?? null,
		leaves: leavesOf(tree.root),
		tabPanes: tabPanesOf(tree),
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
	const minted = mintedLeafOf(tree, view);
	const root = withPlaced(tree.root, at, minted);

	if (root === null) {
		return null;
	}

	const standing = leavesOf(tree.root).find((leaf) => isSameView(leaf.view, view));
	const placedId = standing?.id ?? minted.id;
	return {
		tree: {
			root,
			minted: standing === undefined ? tree.minted + 1 : tree.minted,
			targetId: view.kind === "app" ? placedId : tree.targetId,
		},
		placedId,
	};
}

export function isAimable(tree: PaneTree, id: string): boolean {
	const leaf = leavesOf(tree.root).find((one) => one.id === id);
	return leaf?.view.kind === "app" && tree.targetId !== id;
}

export function withTarget(tree: PaneTree, id: string): PaneTree {
	return {
		...tree,
		targetId: id,
	};
}

export function treeWithoutPane(tree: PaneTree, id: string): PaneTree {
	return {
		...tree,
		root: withoutPane(tree.root, id),
		targetId: tree.targetId === id ? null : tree.targetId,
	};
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

export function withSplitShare(tree: PaneTree, { splitId, at, share }: SplitShare): PaneTree {
	if (tree.root === null) {
		return tree;
	}

	return {
		...tree,
		root: withShare(tree.root, splitId, at, share),
	};
}

export function shareAt(tree: PaneTree, { splitId, at }: Omit<SplitShare, "share">): number {
	return splitOf(tree.root, splitId)?.shares[at] ?? 0;
}

export function paneShowingTab(tree: PaneTree, tabId: string): string | null {
	return tabPanesOf(tree).find((pane) => pane.tabId === tabId)?.paneId ?? null;
}

export function tabTargetOf(tree: PaneTree): TabPane | null {
	const target = leavesOf(tree.root).find((leaf) => leaf.id === tree.targetId);

	if (target?.view.kind !== "app" || target.view.tabId === null) {
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

export function chatPaneOf(tree: PaneTree): PaneLeaf | null {
	return leavesOf(tree.root).find((leaf) => leaf.view.kind === "chat") ?? null;
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

function splitOf(node: PaneNode | null, splitId: string): PaneSplit | null {
	if (node === null || node.kind === "pane") {
		return null;
	}

	if (node.id === splitId) {
		return node;
	}

	return node.children.reduce<PaneSplit | null>((found, child) => found ?? splitOf(child, splitId), null);
}
