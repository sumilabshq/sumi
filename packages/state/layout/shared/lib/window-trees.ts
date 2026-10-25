import type { PaneNode, PaneTree, PaneView } from "../schema/pane-tree.schema.js";
import { leavesOf } from "./pane-nodes.js";
import { treeWithoutPanes } from "./pane-trees.js";

export interface WindowTree {
	readonly window: string;
	readonly tree: PaneTree;
}

export type HeldStamps = Readonly<Record<string, number>>;

export interface KeptWindow extends WindowTree {
	readonly stamps: HeldStamps;
}

export interface WindowHolds {
	readonly window: string;
	readonly tabIds: readonly string[];
	readonly chatIds: readonly string[];
}

export function treeHeldBy(own: KeptWindow, others: readonly KeptWindow[]): PaneTree {
	const lost = new Set(viewKeysOf(own.tree).filter((key) => others.some((other) => isHeldLater(other, own, key))));

	if (lost.size === 0) {
		return own.tree;
	}

	const goneIds = leavesOf(own.tree.root)
		.filter((leaf) => keyOf(leaf.view).some((key) => lost.has(key)))
		.map((leaf) => leaf.id);
	const left = treeWithoutPanes(own.tree, goneIds);
	return {
		...left,
		shelved: Object.fromEntries(
			Object.entries(left.shelved ?? {}).filter(([, node]) => !nodeKeysOf(node).some((key) => lost.has(key))),
		),
	};
}

export function stampsAfter(was: KeptWindow, tree: PaneTree, now: number): HeldStamps {
	const wasKeys = new Set(viewKeysOf(was.tree));
	return Object.fromEntries(viewKeysOf(tree).map((key) => [key, wasKeys.has(key) ? (was.stamps[key] ?? now) : now]));
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

function isHeldLater(other: KeptWindow, own: KeptWindow, key: string): boolean {
	if (!viewKeysOf(other.tree).includes(key)) {
		return false;
	}

	const theirs = other.stamps[key] ?? 0;
	const ours = own.stamps[key] ?? 0;
	return theirs > ours || (theirs === ours && other.window < own.window);
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
