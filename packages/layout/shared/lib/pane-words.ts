import type { PaneNode, PaneTree, PaneView } from "../schema/pane-tree.schema.js";

export function viewWords(view: PaneView): string {
	return view.kind === "chat" ? "the chat" : `tab ${view.tabId ?? "shown"}`;
}

export function shapeWords(node: PaneNode | null): string {
	if (node === null) {
		return "empty";
	}

	if (node.kind === "pane") {
		return `${node.id}(${viewWords(node.view)})`;
	}

	return `${node.dir}[${node.children.map(shapeWords).join(", ")}]`;
}

export function paneTransitionOf(was: PaneTree, now: PaneTree, why: string): string {
	return `panes ${shapeWords(was.root)} → ${shapeWords(now.root)} (${why})`;
}

export function goneTabsWords(tabIds: readonly string[]): string {
	return tabIds.length === 1 ? `kept tab ${tabIds.join("")} is gone` : `kept tabs ${tabIds.join(", ")} are gone`;
}
