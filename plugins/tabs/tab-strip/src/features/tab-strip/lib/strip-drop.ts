import type { TabDrop } from "@widgetarium/app-host/contract";
import { listedIdOf } from "./strip-items.js";
import type { StripItem } from "./strip-items.js";

export interface StripLanding {
	readonly others: readonly StripItem[];
	readonly index: number;
	readonly newTabList: string;
}

export function stripDropOf({ others, index, newTabList }: StripLanding): TabDrop {
	const before = others[index];

	if (before !== undefined) {
		return listDropOf(before.list, before.kind === "tab" ? before.groupId : null, listedIdOf(before));
	}

	const last = others.at(-1);
	return listDropOf(last === undefined ? newTabList : last.list, null, null);
}

function listDropOf(list: string, groupId: string | null, before: string | null): TabDrop {
	return {
		kind: "list",
		list,
		groupId,
		before,
	};
}
