import type { TabDrop } from "@widgetarium/app-host/contract";
import { PINNED_LIST, listedIdOf } from "./strip-items.js";
import type { StripItem } from "./strip-items.js";

export interface StripLanding {
	readonly dragged: StripItem;
	readonly others: readonly StripItem[];
	readonly index: number;
	readonly newTabList: string;
}

export function stripDropOf({ dragged, others, index, newTabList }: StripLanding): TabDrop {
	const before = others[index];

	if (dragged.isPinned && before?.isPinned !== true) {
		return listDropOf(PINNED_LIST, null, null);
	}

	if (before !== undefined) {
		return listDropOf(before.list, before.kind === "tab" ? before.groupId : null, listedIdOf(before));
	}

	const last = others.at(-1);
	return listDropOf(last === undefined || last.isPinned ? newTabList : last.list, null, null);
}

function listDropOf(list: string, groupId: string | null, before: string | null): TabDrop {
	return {
		kind: "list",
		list,
		groupId,
		before,
	};
}
