import type { TabDrop } from "@widgetarium/app-host";

export type ListDrop = Extract<TabDrop, { kind: "list" }>;

export type SplitDrop = Extract<TabDrop, { kind: "split" }>;

export function isSameDrop(one: TabDrop, other: TabDrop): boolean {
	if (one.kind === "essentials" && other.kind === "essentials") {
		return one.at === other.at;
	}

	if (one.kind === "split" && other.kind === "split") {
		return one.splitId === other.splitId && one.before === other.before;
	}

	if (one.kind === "list" && other.kind === "list") {
		return isSameListDrop(one, other);
	}

	return one.kind === other.kind;
}

export function listDrop(list: string, groupId: string | null, before: string | null): ListDrop {
	return {
		kind: "list",
		list,
		groupId,
		before,
	};
}

export function splitDrop(splitId: string, before: string | null): SplitDrop {
	return {
		kind: "split",
		splitId,
		before,
	};
}

function isSameListDrop(one: ListDrop, other: ListDrop): boolean {
	return one.list === other.list && one.groupId === other.groupId && one.before === other.before;
}
