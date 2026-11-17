import type { PaneNode, PaneTree, PaneView } from "../../schema/pane-tree.schema.js";
import { leavesOf } from "./pane-nodes.js";
import { treeWithoutPanes } from "./pane-trees.js";

export interface WindowTree {
	readonly window: string;
	readonly tree: PaneTree;
}

export interface WindowHolds {
	readonly window: string;
	readonly tabIds: readonly string[];
	readonly chatIds: readonly string[];
}

export function treeHeldBy(own: PaneTree, earlier: readonly WindowTree[]): PaneTree {
	const taken = new Set(earlier.flatMap(({ tree }) => viewKeysOf(tree)));
	const lost = new Set(viewKeysOf(own).filter((key) => taken.has(key)));

	if (lost.size === 0) {
		return own;
	}

	const goneIds = leavesOf(own.root)
		.filter((leaf) => keyOf(leaf.view).some((key) => lost.has(key)))
		.map((leaf) => leaf.id);
	const left = treeWithoutPanes(own, goneIds);
	return {
		...left,
		shelved: Object.fromEntries(
			Object.entries(left.shelved ?? {}).filter(([, node]) => !nodeKeysOf(node).some((key) => lost.has(key))),
		),
	};
}

export function holdsOf(others: readonly WindowTree[]): readonly WindowHolds[] {
	return others.map(({ window, tree }) => {
		const views = leavesOf(tree.root).map((leaf) => leaf.view);
		return {
			window,
			tabIds: views.flatMap((view) => (view.kind === "app" && view.tabId !== null ? [view.tabId] : [])),
			chatIds: views.flatMap((view) => (view.kind === "chat" && view.chatId !== undefined ? [view.chatId] : [])),
		};
	});
}

function viewKeysOf(tree: PaneTree): readonly string[] {
	return [...nodeKeysOf(tree.root), ...Object.values(tree.shelved ?? {}).flatMap(nodeKeysOf)];
}

function nodeKeysOf(node: PaneNode | null): readonly string[] {
	return leavesOf(node).flatMap((leaf) => keyOf(leaf.view));
}

function keyOf(view: PaneView): readonly string[] {
	if (view.kind === "app") {
		return view.tabId === null ? [] : [`tab:${view.tabId}`];
	}

	return view.chatId === undefined ? [] : [`chat:${view.chatId}`];
}
