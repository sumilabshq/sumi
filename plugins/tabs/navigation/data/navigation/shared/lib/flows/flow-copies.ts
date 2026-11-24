import type { Flow, FlowNode, FlowsDoc } from "../../schema/flows.schema.js";
import { flowOfId, folderHolding } from "./flow-docs.js";

export interface FlowPlaceAfter {
	readonly folderId: string | null;
	readonly before: string | null;
}

export function layoutWithTabsRenamed(layout: Flow["layout"], copyOfTab: ReadonlyMap<string, string>): Flow["layout"] {
	return { ...layout, root: nodeWithTabsRenamed(layout.root, copyOfTab) };
}

export function layoutWithFreshIds(layout: Flow["layout"], mintedAcrossDoc: number): Flow["layout"] {
	const minting = { minted: mintedAcrossDoc, freshOf: new Map<string, string>() };
	const root = nodeWithFreshIds(layout.root, minting);
	return {
		root,
		focusedPaneId: minting.freshOf.get(layout.focusedPaneId) ?? layout.focusedPaneId,
		minted: minting.minted,
	};
}

interface IdMinting {
	minted: number;
	readonly freshOf: Map<string, string>;
}

function nodeWithFreshIds(node: FlowNode, minting: IdMinting): FlowNode {
	minting.minted += 1;
	const id = `${node.kind}-m${minting.minted}`;
	minting.freshOf.set(node.id, id);

	if (node.kind === "pane") {
		return { ...node, id };
	}

	return { ...node, id, children: node.children.map((child) => nodeWithFreshIds(child, minting)) };
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
