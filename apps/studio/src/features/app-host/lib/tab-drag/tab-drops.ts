import type { TabDrop } from "@widgetarium/app-host/contract";

export type ListDrop = Extract<TabDrop, { kind: "list" }>;

export type SplitDrop = Extract<TabDrop, { kind: "split" }>;

export interface Rename {
	readonly was: string;
	readonly now: string;
}

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

export function renameDrop(drop: TabDrop, { was, now }: Rename): TabDrop {
	if ((drop.kind !== "list" && drop.kind !== "split") || drop.before !== was) {
		return drop;
	}

	return {
		...drop,
		before: now,
	};
}

function isSameListDrop(one: ListDrop, other: ListDrop): boolean {
	return one.list === other.list && one.groupId === other.groupId && one.before === other.before;
}
