import type { PaneLeaf } from "../../schema/pane-tree.schema.js";
import { heldTabOf } from "../tabs/host-tabs.js";
import type { HostTabsMoment } from "../tabs/host-tabs.js";
import { mainPageOf } from "../tabs/sub-pages.js";

export function hidableIdsOf(
	leaves: readonly PaneLeaf[],
	closableIds: readonly string[],
	moment: HostTabsMoment | null,
): string[] {
	const mainOf = (leaf: PaneLeaf): string | null => {
		const tabId = tabIdOfLeaf(leaf, moment);
		return moment === null || tabId === null ? null : mainPageOf(moment, tabId);
	};
	const shownMainIds = leaves.map(mainOf).filter((id) => id !== null);
	const isShownMain = (leaf: PaneLeaf): boolean => shownMainIds.includes(tabIdOfLeaf(leaf, moment) ?? "");
	return leaves
		.filter((leaf) => closableIds.includes(leaf.id))
		.filter((leaf) => mainOf(leaf) !== null || (leaf.view.kind === "app" && !isShownMain(leaf)))
		.map((leaf) => leaf.id);
}

function tabIdOfLeaf(leaf: PaneLeaf, moment: HostTabsMoment | null): string | null {
	if (leaf.view.kind === "app") {
		return leaf.view.tabId;
	}

	return moment === null || leaf.view.chatId === undefined ? null : (heldTabOf(moment, leaf.view.chatId)?.id ?? null);
}
