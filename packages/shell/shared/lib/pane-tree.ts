import type { PaneLeaf, PaneNode, PaneSide, PaneView, SplitDir } from "../schema/pane-tree.schema.js";

export function leavesOf(node: PaneNode | null): readonly PaneLeaf[] {
	if (node === null) {
		return [];
	}

	return node.kind === "pane" ? [node] : node.children.flatMap((child) => leavesOf(child));
}

export interface PanePlace {
	readonly targetId: string | null;
	readonly side: PaneSide;
}

export function placedRoot(root: PaneNode | null, at: PanePlace, leaf: PaneLeaf): PaneNode | null {
	const standing = leavesOf(root).find((placed) => isSameView(placed.view, leaf.view));

	if (standing !== undefined && standing.id === at.targetId) {
		return null;
	}

	const cleared = standing === undefined ? root : withoutPane(root, standing.id);
	return withPane(cleared, at.targetId, at.side, leaf);
}

export function isSameView(one: PaneView, other: PaneView): boolean {
	if (one.kind === "chat" || other.kind === "chat") {
		return one.kind === other.kind;
	}

	return one.tabId === other.tabId;
}

export function withoutPane(node: PaneNode | null, paneId: string): PaneNode | null {
	if (node === null || node.id === paneId) {
		return null;
	}

	if (node.kind === "pane") {
		return node;
	}

	const children = node.children.flatMap((child) => withoutPane(child, paneId) ?? []);
	return children.length === 1 ? (children[0] ?? null) : childrenWith(node, children);
}

export function withPane(node: PaneNode | null, targetId: string | null, side: PaneSide, leaf: PaneLeaf): PaneNode {
	if (node === null || targetId === null) {
		return node === null ? leaf : besideOf(node, side, leaf, `${leaf.id}-around`);
	}

	if (side === "center") {
		return replaced(node, targetId, leaf);
	}

	return placedBeside(node, targetId, side, leaf);
}

function placedBeside(node: PaneNode, targetId: string, side: PaneSide, leaf: PaneLeaf): PaneNode {
	if (node.id === targetId) {
		return besideOf(node, side, leaf, `${leaf.id}-around`);
	}

	if (node.kind === "pane") {
		return node;
	}

	const at = node.children.findIndex((child) => child.id === targetId);

	if (at !== -1 && node.dir === dirOf(side)) {
		const cut = isBefore(side) ? at : at + 1;
		return childrenWith(node, [...node.children.slice(0, cut), leaf, ...node.children.slice(cut)]);
	}

	return childrenWith(
		node,
		node.children.map((child) => placedBeside(child, targetId, side, leaf)),
	);
}

function replaced(node: PaneNode, targetId: string, leaf: PaneLeaf): PaneNode {
	if (node.id === targetId) {
		return leaf;
	}

	if (node.kind === "pane") {
		return node;
	}

	return childrenWith(
		node,
		node.children.map((child) => replaced(child, targetId, leaf)),
	);
}

function besideOf(node: PaneNode, side: PaneSide, leaf: PaneLeaf, splitId: string): PaneNode {
	return {
		kind: "split",
		id: splitId,
		dir: dirOf(side),
		children: isBefore(side) ? [leaf, node] : [node, leaf],
	};
}

function childrenWith(node: Extract<PaneNode, { kind: "split" }>, children: readonly PaneNode[]): PaneNode {
	return {
		...node,
		children,
	};
}

function dirOf(side: PaneSide): SplitDir {
	return side === "top" || side === "bottom" ? "column" : "row";
}

function isBefore(side: PaneSide): boolean {
	return side === "left" || side === "top";
}
