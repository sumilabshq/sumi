import type { FlowLayout, FlowNode, FlowPane } from "../../schema/flows.schema.js";
import type { SplitSide } from "../../schema/splits.schema.js";
import { panesOf } from "./flow-nodes.js";
import { layoutWithoutTabs } from "./flow-panes.js";

export type LayoutEdit = FlowLayout | string;

export interface TabMove {
	readonly tabId: string;
	readonly paneId: string;
	readonly before: string | null;
}

export interface PaneSplitting {
	readonly paneId: string;
	readonly side: SplitSide;
	readonly tabId: string;
}

export interface ShareChange {
	readonly splitId: string;
	readonly at: number;
	readonly share: number;
}

const NO_TAB = 'the flow holds no tab "{id}"';
const NO_PANE = 'the flow holds no pane "{id}"';
const NO_BEFORE = 'the pane "{pane}" holds no tab "{id}" to stand before';
const ONLY_TAB = 'the pane "{id}" holds only this tab: splitting it off would leave nothing to split';
const SOLE_PANE = "a flow keeps at least one pane: the sole pane cannot be closed";
const NO_SPLIT = 'the flow holds no split "{id}" with a pane at {at} and the next one';
const BAD_SHARE = "a share lies between 0 and the two neighbours' shares together ({pair})";
const MINTED_BY_A_SPLIT = 2;

export function isRefusedEdit(edit: LayoutEdit): edit is string {
	return typeof edit === "string";
}

export function layoutWithTabMoved(layout: FlowLayout, move: TabMove): LayoutEdit {
	const source = paneOfTab(layout, move.tabId);
	const target = paneOfId(layout, move.paneId);

	if (source === undefined) {
		return NO_TAB.replace("{id}", move.tabId);
	}

	if (target === undefined) {
		return NO_PANE.replace("{id}", move.paneId);
	}

	if (move.before !== null && (move.before === move.tabId || !target.tabIds.includes(move.before))) {
		return NO_BEFORE.replace("{pane}", target.id).replace("{id}", move.before);
	}

	const removed = source.id === target.id ? layout : layoutWithoutTabs(layout, new Set([move.tabId]));
	return {
		...withPaneChanged(removed, target.id, (pane) => ({
			...pane,
			tabIds: insertedBefore(
				pane.tabIds.filter((id) => id !== move.tabId),
				move.tabId,
				move.before,
			),
			activeTabId: move.tabId,
		})),
		focusedPaneId: target.id,
	};
}

export function layoutWithSplit(layout: FlowLayout, splitting: PaneSplitting): LayoutEdit {
	const source = paneOfTab(layout, splitting.tabId);
	const anchor = paneOfId(layout, splitting.paneId);

	if (source === undefined) {
		return NO_TAB.replace("{id}", splitting.tabId);
	}

	if (anchor === undefined) {
		return NO_PANE.replace("{id}", splitting.paneId);
	}

	if (source.id === anchor.id && anchor.tabIds.length === 1) {
		return ONLY_TAB.replace("{id}", anchor.id);
	}

	const removed = layoutWithoutTabs(layout, new Set([splitting.tabId]));
	const fresh: FlowPane = {
		kind: "pane",
		id: `pane-m${removed.minted + 1}`,
		tabIds: [splitting.tabId],
		activeTabId: splitting.tabId,
	};
	return {
		root: splitAround(removed.root, {
			anchorId: anchor.id,
			fresh,
			side: splitting.side,
			splitId: `split-m${removed.minted + 2}`,
		}),
		focusedPaneId: fresh.id,
		minted: removed.minted + MINTED_BY_A_SPLIT,
	};
}

export function layoutWithPaneClosed(layout: FlowLayout, paneId: string): LayoutEdit {
	const panes = panesOf(layout.root);
	const at = panes.findIndex(({ id }) => id === paneId);
	const closing = panes[at];
	const neighbour = panes[at - 1] ?? panes[at + 1];

	if (closing === undefined) {
		return NO_PANE.replace("{id}", paneId);
	}

	if (neighbour === undefined) {
		return SOLE_PANE;
	}

	const merged = withPaneChanged(layout, neighbour.id, (pane) => ({
		...pane,
		tabIds: [...pane.tabIds, ...closing.tabIds],
	}));
	return {
		...merged,
		root: withoutPaneNode(merged.root, paneId) ?? merged.root,
		focusedPaneId: neighbour.id,
	};
}

export function layoutWithShare(layout: FlowLayout, change: ShareChange): LayoutEdit {
	const pair = pairOf(layout.root, change);

	if (pair === null) {
		return NO_SPLIT.replace("{id}", change.splitId).replace("{at}", String(change.at));
	}

	if (!(change.share > 0 && change.share < pair)) {
		return BAD_SHARE.replace("{pair}", String(pair));
	}

	return {
		...layout,
		root: withShareChanged(layout.root, { ...change, pair }),
	};
}

export function layoutWithFocus(layout: FlowLayout, paneId: string): LayoutEdit {
	return paneOfId(layout, paneId) === undefined
		? NO_PANE.replace("{id}", paneId)
		: { ...layout, focusedPaneId: paneId };
}

export function layoutWithTabShown(layout: FlowLayout, tabId: string): LayoutEdit {
	const pane = paneOfTab(layout, tabId);

	if (pane === undefined) {
		return NO_TAB.replace("{id}", tabId);
	}

	return {
		...withPaneChanged(layout, pane.id, (held) => ({ ...held, activeTabId: tabId })),
		focusedPaneId: pane.id,
	};
}

function paneOfTab(layout: FlowLayout, tabId: string): FlowPane | undefined {
	return panesOf(layout.root).find((pane) => pane.tabIds.includes(tabId));
}

function paneOfId(layout: FlowLayout, paneId: string): FlowPane | undefined {
	return panesOf(layout.root).find(({ id }) => id === paneId);
}

function insertedBefore(ids: readonly string[], id: string, before: string | null): string[] {
	const at = before === null ? -1 : ids.indexOf(before);
	const cut = at === -1 ? ids.length : at;
	return [...ids.slice(0, cut), id, ...ids.slice(cut)];
}

function withPaneChanged(layout: FlowLayout, paneId: string, change: (pane: FlowPane) => FlowPane): FlowLayout {
	return {
		...layout,
		root: paneChangedIn(layout.root, paneId, change),
	};
}

function paneChangedIn(node: FlowNode, paneId: string, change: (pane: FlowPane) => FlowPane): FlowNode {
	if (node.kind === "pane") {
		return node.id === paneId ? change(node) : node;
	}

	return {
		...node,
		children: node.children.map((child) => paneChangedIn(child, paneId, change)),
	};
}

interface SplitAround {
	readonly anchorId: string;
	readonly fresh: FlowPane;
	readonly side: SplitSide;
	readonly splitId: string;
}

function splitAround(node: FlowNode, around: SplitAround): FlowNode {
	const dir = around.side === "left" || around.side === "right" ? "row" : "column";
	const isFirst = around.side === "left" || around.side === "top";

	if (node.kind === "pane") {
		return node.id === around.anchorId
			? {
					kind: "split",
					id: around.splitId,
					dir,
					children: isFirst ? [around.fresh, node] : [node, around.fresh],
					shares: [0.5, 0.5],
				}
			: node;
	}

	const at = node.children.findIndex((child) => child.kind === "pane" && child.id === around.anchorId);

	if (at === -1 || node.dir !== dir) {
		return {
			...node,
			children: node.children.map((child) => splitAround(child, around)),
		};
	}

	const half = (node.shares[at] ?? 1) / 2;
	const cut = isFirst ? at : at + 1;
	return {
		...node,
		children: [...node.children.slice(0, cut), around.fresh, ...node.children.slice(cut)],
		shares: [...node.shares.slice(0, at), half, half, ...node.shares.slice(at + 1)],
	};
}

function withoutPaneNode(node: FlowNode, paneId: string): FlowNode | null {
	if (node.kind === "pane") {
		return node.id === paneId ? null : node;
	}

	const survivors = node.children.flatMap((child, at) => {
		const kept = withoutPaneNode(child, paneId);
		return kept === null ? [] : [{ kept, share: node.shares[at] ?? 1 }];
	});
	const [only] = survivors;

	if (survivors.length <= 1) {
		return only?.kept ?? null;
	}

	return {
		...node,
		children: survivors.map(({ kept }) => kept),
		shares: survivors.map(({ share }) => share),
	};
}

function pairOf(node: FlowNode, { splitId, at }: ShareChange): number | null {
	if (node.kind === "pane") {
		return null;
	}

	if (node.id === splitId) {
		const first = node.shares[at];
		const second = node.shares[at + 1];
		return first === undefined || second === undefined ? null : first + second;
	}

	return node.children.map((child) => pairOf(child, { splitId, at, share: 0 })).find((pair) => pair !== null) ?? null;
}

function withShareChanged(node: FlowNode, change: ShareChange & { readonly pair: number }): FlowNode {
	if (node.kind === "pane") {
		return node;
	}

	if (node.id !== change.splitId) {
		return {
			...node,
			children: node.children.map((child) => withShareChanged(child, change)),
		};
	}

	return {
		...node,
		shares: node.shares.map((share, index) => {
			if (index === change.at) {
				return change.share;
			}

			return index === change.at + 1 ? change.pair - change.share : share;
		}),
	};
}
