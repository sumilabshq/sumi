import type { FlowLayout, FlowNode, FlowPane } from "../../schema/flows.schema.js";
import { panesOf } from "./flow-nodes.js";

export function layoutWithoutTabs(layout: FlowLayout, gone: ReadonlySet<string>): FlowLayout {
	const pruned = prunedNode(layout.root, gone);
	const root = pruned ?? emptiedPane(layout.root);
	const paneIds = panesOf(root).map(({ id }) => id);
	return {
		...layout,
		root,
		focusedPaneId: paneIds.includes(layout.focusedPaneId) ? layout.focusedPaneId : (paneIds[0] ?? layout.focusedPaneId),
	};
}

export function layoutWithTab(layout: FlowLayout, tabId: string, paneId: string): FlowLayout {
	return {
		...layout,
		root: withTabAdded(layout.root, paneId, tabId),
	};
}

function withTabAdded(node: FlowNode, paneId: string, tabId: string): FlowNode {
	if (node.kind === "split") {
		return {
			...node,
			children: node.children.map((child) => withTabAdded(child, paneId, tabId)),
		};
	}

	if (node.id !== paneId || node.tabIds.includes(tabId)) {
		return node;
	}

	return {
		...node,
		tabIds: [...node.tabIds, tabId],
		activeTabId: tabId,
	};
}

function emptiedPane(root: FlowNode): FlowPane {
	const [first] = panesOf(root);
	return {
		kind: "pane",
		id: first?.id ?? "",
		tabIds: [],
		activeTabId: null,
	};
}

function prunedNode(node: FlowNode, gone: ReadonlySet<string>): FlowNode | null {
	if (node.kind === "pane") {
		return prunedPane(node, gone);
	}

	const survivors = node.children.flatMap((child, at) => {
		const pruned = prunedNode(child, gone);
		return pruned === null ? [] : [{ pruned, share: node.shares[at] ?? 1 }];
	});
	const [only] = survivors;

	if (survivors.length <= 1) {
		return only?.pruned ?? null;
	}

	return {
		...node,
		children: survivors.map(({ pruned }) => pruned),
		shares: survivors.map(({ share }) => share),
	};
}

function prunedPane(pane: FlowPane, gone: ReadonlySet<string>): FlowPane | null {
	const tabIds = pane.tabIds.filter((id) => !gone.has(id));

	if (tabIds.length === pane.tabIds.length) {
		return pane;
	}

	if (tabIds.length === 0) {
		return null;
	}

	return {
		...pane,
		tabIds,
		activeTabId: activeAfter(pane, tabIds, gone),
	};
}

function activeAfter(pane: FlowPane, tabIds: readonly string[], gone: ReadonlySet<string>): string | null {
	if (pane.activeTabId !== null && !gone.has(pane.activeTabId)) {
		return pane.activeTabId;
	}

	const wasAt = pane.activeTabId === null ? 0 : pane.tabIds.indexOf(pane.activeTabId);
	const before = pane.tabIds.slice(0, wasAt).filter((id) => !gone.has(id));
	return before.at(-1) ?? tabIds[0] ?? null;
}
