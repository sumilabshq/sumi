import type { PaneLeaf, PaneNode, PaneSide, PaneSplit, PaneView, SplitDir } from "../schema/pane-tree.schema.js";

export interface PanePlace {
	readonly targetId: string | null;
	readonly side: PaneSide;
}

interface PanePart {
	readonly node: PaneNode;
	readonly share: number;
}

const HALVES = [0.5, 0.5] as const;

export function leavesOf(node: PaneNode | null): readonly PaneLeaf[] {
	if (node === null) {
		return [];
	}

	return node.kind === "pane" ? [node] : node.children.flatMap((child) => leavesOf(child));
}

export function withPlaced(root: PaneNode | null, at: PanePlace, leaf: PaneLeaf): PaneNode | null {
	const standing = leavesOf(root).find((placed) => isSameView(placed.view, leaf.view));

	if (standing !== undefined && standing.id === at.targetId) {
		return null;
	}

	const cleared = standing === undefined ? root : withoutPane(root, standing.id);
	return withPane(cleared, at, standing ?? leaf);
}

export function withoutPane(node: PaneNode | null, paneId: string): PaneNode | null {
	if (node === null || node.id === paneId) {
		return null;
	}

	if (node.kind === "pane") {
		return node;
	}

	const kept = partsOf(node).flatMap(({ node: child, share }) => {
		const left = withoutPane(child, paneId);
		return left === null ? [] : [{ node: left, share }];
	});

	if (kept.length < 2) {
		return kept[0]?.node ?? null;
	}

	return splitOf(node, kept);
}

export function withView(node: PaneNode | null, paneId: string, view: PaneView): PaneNode | null {
	if (node === null) {
		return null;
	}

	if (node.kind === "pane") {
		return node.id === paneId ? { ...node, view } : node;
	}

	return {
		...node,
		children: node.children.flatMap((child) => withView(child, paneId, view) ?? []),
	};
}

export function withShare(node: PaneNode, splitId: string, at: number, share: number): PaneNode {
	if (node.kind === "pane") {
		return node;
	}

	if (node.id !== splitId) {
		return {
			...node,
			children: node.children.map((child) => withShare(child, splitId, at, share)),
		};
	}

	const pair = (node.shares[at] ?? 0) + (node.shares[at + 1] ?? 0);
	const kept = Math.min(Math.max(share, 0), pair);
	return {
		...node,
		shares: node.shares.map((one, index) => pairShareOf(index, at, [kept, pair - kept]) ?? one),
	};
}

export function isSameView(one: PaneView, other: PaneView): boolean {
	if (one.kind === "chat" || other.kind === "chat") {
		return one.kind === other.kind;
	}

	return one.tabId === other.tabId;
}

function withPane(node: PaneNode | null, { targetId, side }: PanePlace, leaf: PaneLeaf): PaneNode {
	if (node === null) {
		return leaf;
	}

	if (targetId === null) {
		return placeAtEdge(node, side, leaf);
	}

	return placeBeside(node, targetId, side, leaf);
}

function placeAtEdge(node: PaneNode, side: PaneSide, leaf: PaneLeaf): PaneNode {
	if (node.kind === "split" && node.dir === dirOf(side)) {
		return withInserted(node, isBefore(side) ? 0 : node.children.length, leaf);
	}

	return besideOf(node, side, leaf);
}

function placeBeside(node: PaneNode, targetId: string, side: PaneSide, leaf: PaneLeaf): PaneNode {
	if (node.id === targetId) {
		return besideOf(node, side, leaf);
	}

	if (node.kind === "pane") {
		return node;
	}

	const at = node.children.findIndex((child) => child.id === targetId);

	if (at !== -1 && node.dir === dirOf(side)) {
		return withInserted(node, isBefore(side) ? at : at + 1, leaf);
	}

	return {
		...node,
		children: node.children.map((child) => placeBeside(child, targetId, side, leaf)),
	};
}

function withInserted(split: PaneSplit, cut: number, leaf: PaneLeaf): PaneSplit {
	const count = split.children.length + 1;
	const parts = partsOf(split).map(({ node, share }) => ({
		node,
		share: (share * (count - 1)) / count,
	}));
	return splitOf(split, [
		...parts.slice(0, cut),
		{
			node: leaf,
			share: 1 / count,
		},
		...parts.slice(cut),
	]);
}

function besideOf(node: PaneNode, side: PaneSide, leaf: PaneLeaf): PaneSplit {
	return {
		kind: "split",
		id: `${leaf.id}-around`,
		dir: dirOf(side),
		children: isBefore(side) ? [leaf, node] : [node, leaf],
		shares: HALVES,
	};
}

function splitOf(split: PaneSplit, parts: readonly PanePart[]): PaneSplit {
	const flat = parts.flatMap((part) =>
		isSplitAlong(part.node, split.dir) ? partsScaled(part.node, part.share) : [part],
	);
	const total = flat.reduce((sum, part) => sum + part.share, 0);
	return {
		...split,
		children: flat.map((part) => part.node),
		shares: flat.map((part) => part.share / total),
	};
}

function partsScaled(split: PaneSplit, by: number): readonly PanePart[] {
	return partsOf(split).map(({ node, share }) => ({
		node,
		share: share * by,
	}));
}

function partsOf(split: PaneSplit): readonly PanePart[] {
	return split.children.map((node, at) => ({
		node,
		share: split.shares[at] ?? 1 / split.children.length,
	}));
}

function isSplitAlong(node: PaneNode, dir: SplitDir): node is PaneSplit {
	return node.kind === "split" && node.dir === dir;
}

function pairShareOf(index: number, at: number, [first, second]: readonly [number, number]): number | null {
	if (index === at) {
		return first;
	}

	return index === at + 1 ? second : null;
}

function dirOf(side: PaneSide): SplitDir {
	return side === "top" || side === "bottom" ? "column" : "row";
}

function isBefore(side: PaneSide): boolean {
	return side === "left" || side === "top";
}
