import type { PaneNode, PaneSplit, PaneTree } from "../schema/pane-tree.schema.js";
import { withShare } from "./pane-nodes.js";

export interface SplitShare {
	readonly splitId: string;
	readonly at: number;
	readonly share: number;
}

const NO_SPLIT = 'no split "{id}" stands on the board';
const NO_EDGE = 'split "{id}" has no edge at {at}';

export function refuseUnknownEdge(tree: PaneTree, { splitId, at }: SplitShare): string | null {
	const split = splitOf(tree.root, splitId);

	if (split === null) {
		return NO_SPLIT.replace("{id}", splitId);
	}

	return at + 1 < split.children.length ? null : NO_EDGE.replace("{id}", splitId).replace("{at}", String(at));
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

function splitOf(node: PaneNode | null, splitId: string): PaneSplit | null {
	if (node === null || node.kind === "pane") {
		return null;
	}

	if (node.id === splitId) {
		return node;
	}

	return node.children.reduce<PaneSplit | null>((found, child) => found ?? splitOf(child, splitId), null);
}
