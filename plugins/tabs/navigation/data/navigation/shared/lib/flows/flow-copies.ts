import type { Flow, FlowNode, FlowsDoc } from "../../schema/flows.schema.js";
import { flowOfId, folderHolding } from "./flow-docs.js";

export interface FlowPlaceAfter {
	readonly folderId: string | null;
	readonly before: string | null;
}

export function layoutWithTabsRenamed(layout: Flow["layout"], copyOfTab: ReadonlyMap<string, string>): Flow["layout"] {
	return { ...layout, root: nodeWithTabsRenamed(layout.root, copyOfTab) };
}

export function placeAfterFlow(doc: FlowsDoc, flowId: string): FlowPlaceAfter | null {
	if (flowOfId(doc, flowId) === undefined) {
		return null;
	}

	const folder = folderHolding(doc, flowId);
	const siblings = folder?.flowIds ?? doc.looseFlowIds;
	return {
		folderId: folder?.id ?? null,
		before: siblings[siblings.indexOf(flowId) + 1] ?? null,
	};
}

function nodeWithTabsRenamed(node: FlowNode, copyOfTab: ReadonlyMap<string, string>): FlowNode {
	if (node.kind === "split") {
		return { ...node, children: node.children.map((child) => nodeWithTabsRenamed(child, copyOfTab)) };
	}

	const renamed = (tabId: string): string => copyOfTab.get(tabId) ?? tabId;
	return {
		...node,
		tabIds: node.tabIds.map(renamed),
		activeTabId: node.activeTabId === null ? null : renamed(node.activeTabId),
	};
}
