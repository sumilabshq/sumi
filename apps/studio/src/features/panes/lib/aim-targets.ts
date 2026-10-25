import { CARRIED_PANE, CARRIED_TAB } from "@widgetarium/behaviors";
import type { CarriedItem } from "@widgetarium/behaviors";
import type { PaneBoard, PaneLeaf } from "@widgetarium/layout";

type ChatGroups = PaneBoard["chatGroups"];

export function homeOfCarried(item: CarriedItem, leaves: readonly PaneLeaf[], groups: ChatGroups): string | null {
	if (item.kind === CARRIED_TAB) {
		return item.home ?? null;
	}

	const leaf = item.kind === CARRIED_PANE ? leaves.find((one) => one.id === item.id) : undefined;

	if (leaf === undefined || leaf.view.kind === "chat") {
		return null;
	}

	return groups.find((group) => group.paneIds.includes(leaf.id))?.chatId ?? null;
}

export function aimTargetIdsOf(groups: ChatGroups, paneIds: readonly string[], home: string | null): readonly string[] {
	if (home !== null) {
		return groups.find((group) => group.chatId === home)?.paneIds ?? [];
	}

	const grouped = new Set(groups.flatMap((group) => group.paneIds));
	return [...paneIds.filter((id) => !grouped.has(id)), ...groups.map((group) => group.groupId)];
}

export function focusedGroupOf(groups: ChatGroups, home: string | null): ChatGroups[number] | null {
	return home === null ? null : (groups.find((group) => group.chatId === home) ?? null);
}
