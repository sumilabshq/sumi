import type { PaneBoard, PaneLeaf, PaneView } from "@widgetarium/layout";

type ChatGroups = PaneBoard["chatGroups"];

export interface ViewTarget {
	readonly tabId: string | null;
}

// TRADE-OFF: layout's id convention for a drawn split, read here until places draws the board itself
const SPLIT_PANE_PREFIX = "pane-split-";

export function branchIdOfPane(splitId: string): string | null {
	return splitId.startsWith(SPLIT_PANE_PREFIX) ? splitId.slice(SPLIT_PANE_PREFIX.length) : null;
}

export function viewTargetOf(
	targetId: string | null,
	leaves: readonly PaneLeaf[],
	groups: ChatGroups,
): ViewTarget | null {
	if (targetId === null) {
		return null;
	}

	const group = groups.find((one) => one.groupId === targetId || one.paneIds.includes(targetId));

	if (group !== undefined) {
		return { tabId: group.chatId };
	}

	const leaf = leaves.find((one) => one.id === targetId);
	return leaf === undefined ? null : viewTabOf(leaf.view);
}

export function carriedTabOf(view: PaneView): string | null {
	return viewTabOf(view)?.tabId ?? null;
}

function viewTabOf(view: PaneView): ViewTarget | null {
	if (view.kind === "app") {
		return { tabId: view.tabId };
	}

	return view.chatId === undefined ? null : { tabId: view.chatId };
}
