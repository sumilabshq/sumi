import type { FlowLayout, FlowNode, FlowPane } from "../../schema/flows.schema.js";
import type { PaneLeaf, PaneNode } from "../../schema/pane-tree.schema.js";
import { firstPaneIdOf } from "./flow-ids.js";
import { panesOf } from "./flow-nodes.js";

export interface FlowMembers {
	readonly flowId: string;
	readonly mainTabId: string;
	readonly tabIds: readonly string[];
}

export interface LayoutMade {
	readonly layout: FlowLayout;
	readonly said: readonly string[];
}

interface Draft {
	readonly seen: Set<string>;
	readonly said: string[];
}

const LEAF_SHOWS_NO_TAB = 'the pane "{pane}" of {flow} shows no tab: dropped';
const LEAF_IN_OTHER_FLOW = 'the pane "{pane}" of {flow} shows "{id}", which stands in no tab of this flow: dropped';
const LEAF_REPEATS_TAB = 'the pane "{pane}" of {flow} shows "{id}" again: dropped';
const NO_PANE_SURVIVED = "{flow}: no pane of the saved layout survived, one pane holds every tab";

export function layoutOfTabs({ flowId, mainTabId, tabIds }: FlowMembers): FlowLayout {
	const paneId = firstPaneIdOf(flowId);
	return {
		root: {
			kind: "pane",
			id: paneId,
			tabIds,
			activeTabId: tabIds.includes(mainTabId) ? mainTabId : (tabIds[0] ?? null),
		},
		focusedPaneId: paneId,
		minted: 0,
	};
}

export function layoutOfPaneNode(node: PaneNode | null, members: FlowMembers): LayoutMade {
	if (node === null) {
		return {
			layout: layoutOfTabs(members),
			said: [],
		};
	}

	const draft: Draft = {
		seen: new Set(),
		said: [],
	};
	const root = flowNodeOf(node, members, draft);

	if (root === null) {
		return {
			layout: layoutOfTabs(members),
			said: [...draft.said, NO_PANE_SURVIVED.replace("{flow}", members.flowId)],
		};
	}

	const joined = withMissingTabsJoined(root, members, draft.seen);
	return {
		layout: {
			root: joined,
			focusedPaneId: focusedPaneOf(joined, members.mainTabId),
			minted: 0,
		},
		said: draft.said,
	};
}

function flowNodeOf(node: PaneNode, members: FlowMembers, draft: Draft): FlowNode | null {
	if (node.kind === "pane") {
		return flowPaneOf(node, members, draft);
	}

	const survivors = node.children.flatMap((child, at) => {
		const made = flowNodeOf(child, members, draft);
		return made === null ? [] : [{ made, share: positiveShareOf(node.shares[at]) }];
	});
	const [only] = survivors;

	if (survivors.length <= 1) {
		return only?.made ?? null;
	}

	return {
		kind: "split",
		id: node.id,
		dir: node.dir,
		children: survivors.map(({ made }) => made),
		shares: survivors.map(({ share }) => share),
	};
}

function flowPaneOf(leaf: PaneLeaf, members: FlowMembers, draft: Draft): FlowPane | null {
	const tabId = leaf.view.kind === "chat" ? (leaf.view.chatId ?? null) : leaf.view.tabId;
	const refusal = leafRefusalOf({ leaf, tabId, members, seen: draft.seen });

	if (refusal !== null) {
		draft.said.push(refusal);
		return null;
	}

	if (tabId === null) {
		return null;
	}

	draft.seen.add(tabId);
	return {
		kind: "pane",
		id: leaf.id,
		tabIds: [tabId],
		activeTabId: tabId,
	};
}

interface LeafFacts {
	readonly leaf: PaneLeaf;
	readonly tabId: string | null;
	readonly members: FlowMembers;
	readonly seen: ReadonlySet<string>;
}

function leafRefusalOf({ leaf, tabId, members, seen }: LeafFacts): string | null {
	const said = (template: string): string =>
		template
			.replace("{pane}", leaf.id)
			.replace("{flow}", members.flowId)
			.replace("{id}", tabId ?? "");

	if (tabId === null) {
		return said(LEAF_SHOWS_NO_TAB);
	}

	if (!members.tabIds.includes(tabId)) {
		return said(LEAF_IN_OTHER_FLOW);
	}

	return seen.has(tabId) ? said(LEAF_REPEATS_TAB) : null;
}

function positiveShareOf(share: number | undefined): number {
	return share !== undefined && share > 0 ? share : 1;
}

function withMissingTabsJoined(root: FlowNode, members: FlowMembers, seen: ReadonlySet<string>): FlowNode {
	const missing = members.tabIds.filter((id) => !seen.has(id));
	const panes = panesOf(root);
	const host = panes.find((pane) => pane.tabIds.includes(members.mainTabId)) ?? panes[0];

	if (missing.length === 0 || host === undefined) {
		return root;
	}

	return withTabsAdded(root, host.id, missing);
}

function withTabsAdded(node: FlowNode, paneId: string, tabIds: readonly string[]): FlowNode {
	if (node.kind === "split") {
		return {
			...node,
			children: node.children.map((child) => withTabsAdded(child, paneId, tabIds)),
		};
	}

	return node.id === paneId ? { ...node, tabIds: [...node.tabIds, ...tabIds] } : node;
}

function focusedPaneOf(root: FlowNode, mainTabId: string): string {
	const panes = panesOf(root);
	return (panes.find((pane) => pane.tabIds.includes(mainTabId)) ?? panes[0])?.id ?? "";
}
