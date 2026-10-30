import type { SplitBranch, SplitDir, SplitNode, SplitSide } from "../../schema/splits.schema.js";

export interface LeafPlacing {
	readonly tabId: string;
	readonly targetTabId: string;
	readonly side: SplitSide;
	readonly branchId: string;
}

export interface BranchShare {
	readonly branchId: string;
	readonly at: number;
	readonly share: number;
}

interface SplitPart {
	readonly node: SplitNode;
	readonly share: number;
}

const HALVES: readonly number[] = [0.5, 0.5];
const LEAST_PAIR_PART = 0.1;

export function leafIdsOf(node: SplitNode): readonly string[] {
	return node.kind === "tab" ? [node.tabId] : node.children.flatMap(leafIdsOf);
}

export function branchIdsOf(node: SplitNode): readonly string[] {
	return node.kind === "tab" ? [] : [node.id, ...node.children.flatMap(branchIdsOf)];
}

export function leafOf(tabId: string): SplitNode {
	return {
		kind: "tab",
		tabId,
	};
}

export function withLeafPlaced(node: SplitNode, placing: LeafPlacing): SplitNode {
	if (node.kind === "tab") {
		return node.tabId === placing.targetTabId ? besideOf(node, placing) : node;
	}

	const at = node.children.findIndex((child) => child.kind === "tab" && child.tabId === placing.targetTabId);

	if (at !== -1 && node.dir === dirOf(placing.side)) {
		return withInserted(node, isBefore(placing.side) ? at : at + 1, leafOf(placing.tabId));
	}

	return {
		...node,
		children: node.children.map((child) => withLeafPlaced(child, placing)),
	};
}

export function withoutLeaf(node: SplitNode, tabId: string): SplitNode | null {
	if (node.kind === "tab") {
		return node.tabId === tabId ? null : node;
	}

	const kept = partsOf(node).flatMap(({ node: child, share }) => {
		const left = withoutLeaf(child, tabId);
		return left === null ? [] : [{ node: left, share }];
	});

	if (kept.length < 2) {
		return kept[0]?.node ?? null;
	}

	return branchOf(node, kept);
}

export function withBranchShare(node: SplitNode, sharing: BranchShare): SplitNode {
	if (node.kind === "tab") {
		return node;
	}

	if (node.id !== sharing.branchId) {
		return {
			...node,
			children: node.children.map((child) => withBranchShare(child, sharing)),
		};
	}

	return withPairShared(node, sharing);
}

export function isEdgeOf(node: SplitNode, { branchId, at }: Omit<BranchShare, "share">): boolean {
	if (node.kind === "tab") {
		return false;
	}

	if (node.id === branchId) {
		return at >= 0 && at < node.children.length - 1;
	}

	return node.children.some((child) => isEdgeOf(child, { branchId, at }));
}

function withPairShared(branch: SplitBranch, { at, share }: BranchShare): SplitBranch {
	const pair = (branch.shares[at] ?? 0) + (branch.shares[at + 1] ?? 0);
	const kept = Math.min(Math.max(share, pair * LEAST_PAIR_PART), pair * (1 - LEAST_PAIR_PART));
	return {
		...branch,
		shares: branch.shares.map((one, index) => pairShareOf(index, at, [kept, pair - kept]) ?? one),
	};
}

function besideOf(node: SplitNode, placing: LeafPlacing): SplitBranch {
	const leaf = leafOf(placing.tabId);
	return {
		kind: "branch",
		id: placing.branchId,
		dir: dirOf(placing.side),
		children: isBefore(placing.side) ? [leaf, node] : [node, leaf],
		shares: HALVES,
	};
}

function withInserted(branch: SplitBranch, cut: number, leaf: SplitNode): SplitBranch {
	const count = branch.children.length + 1;
	const parts = partsOf(branch).map(({ node, share }) => ({
		node,
		share: (share * (count - 1)) / count,
	}));
	return branchOf(branch, [...parts.slice(0, cut), { node: leaf, share: 1 / count }, ...parts.slice(cut)]);
}

function branchOf(branch: SplitBranch, parts: readonly SplitPart[]): SplitBranch {
	const flat = parts.flatMap((part) => (isAlong(part.node, branch.dir) ? partsScaled(part.node, part.share) : [part]));
	const total = flat.reduce((sum, part) => sum + part.share, 0);
	return {
		...branch,
		children: flat.map((part) => part.node),
		shares: flat.map((part) => part.share / total),
	};
}

function partsScaled(branch: SplitBranch, by: number): readonly SplitPart[] {
	return partsOf(branch).map(({ node, share }) => ({
		node,
		share: share * by,
	}));
}

function partsOf(branch: SplitBranch): readonly SplitPart[] {
	return branch.children.map((node, at) => ({
		node,
		share: branch.shares[at] ?? 1 / branch.children.length,
	}));
}

function isAlong(node: SplitNode, dir: SplitDir): node is SplitBranch {
	return node.kind === "branch" && node.dir === dir;
}

function pairShareOf(index: number, at: number, [first, second]: readonly [number, number]): number | null {
	if (index === at) {
		return first;
	}

	return index === at + 1 ? second : null;
}

function dirOf(side: SplitSide): SplitDir {
	return side === "top" || side === "bottom" ? "column" : "row";
}

function isBefore(side: SplitSide): boolean {
	return side === "left" || side === "top";
}
