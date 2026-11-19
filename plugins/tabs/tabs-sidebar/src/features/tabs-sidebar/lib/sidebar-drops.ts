import type { SidebarSortDrop } from "@widgetarium/kit";
import type { SidebarEntry, SidebarGroupItem, SidebarSection, TabDrop, TabsSidebar } from "@widgetarium/app-host/contract";

export const GROUP_ROW = "group:";
export const SPLIT_ROW = "split:";

export interface GroupPlace {
	readonly list: string;
	readonly groupId: string | null;
	readonly before: string | null;
}

export type Placed =
	| {
			readonly kind: "tab";
			readonly id: string;
			readonly to: TabDrop;
	  }
	| {
			readonly kind: "group";
			readonly id: string;
			readonly to: GroupPlace;
	  };

export interface Carried {
	readonly node: SidebarGroupItem;
	readonly depth: number;
}

type Holder =
	| {
			readonly kind: "list";
			readonly list: string;
	  }
	| {
			readonly kind: "group";
			readonly list: string;
			readonly groupId: string;
	  }
	| {
			readonly kind: "split";
			readonly splitId: string;
	  };

interface SortRow {
	readonly sortId: string;
	readonly entryId: string | null;
	readonly list: string;
	readonly depth: number;
	readonly holds: Holder | null;
	readonly isOpen: boolean;
}

export function sortIdOf(node: SidebarEntry): string {
	if (node.kind === "tab") {
		return node.tab.id;
	}

	return node.kind === "group" ? `${GROUP_ROW}${node.group.id}` : `${SPLIT_ROW}${node.split.id}`;
}

export function entryIdOf(node: SidebarEntry): string | null {
	if (node.kind === "tab") {
		return node.tab.id;
	}

	return node.kind === "group" ? node.group.id : (node.split.members[0]?.item.tab.id ?? null);
}

export function placedOf(without: TabsSidebar, carried: Carried, { targetId, place, levels }: SidebarSortDrop): Placed | null {
	const rows = without.sections.flatMap(sectionRows);
	const target = rows.find((row) => row.sortId === targetId);

	if (target === undefined) {
		return null;
	}

	if (place === "into") {
		return target.holds === null ? null : placedIn(carried.node, target.holds, null);
	}

	const listed = rows.filter((row) => row.list === target.list);
	const gap = listed.indexOf(target) + (place === "before" ? 0 : 1);
	const above = listed[gap - 1];
	const below = listed[gap];
	const deepest = above === undefined ? 0 : above.depth + (above.holds !== null && above.isOpen ? 1 : 0);
	const depth = Math.min(deepest, Math.max(below?.depth ?? 0, carried.depth + levels));
	const holder = holderAt(listed.slice(0, gap), depth, target.list);

	if (holder === null) {
		return null;
	}

	return placedIn(carried.node, holder, below !== undefined && below.depth === depth ? below.entryId : null);
}

function holderAt(above: readonly SortRow[], depth: number, list: string): Holder | null {
	if (depth === 0) {
		return {
			kind: "list",
			list,
		};
	}

	return [...above].reverse().find((row) => row.depth === depth - 1)?.holds ?? null;
}

function placedIn(node: SidebarGroupItem, holder: Holder, before: string | null): Placed | null {
	if (holder.kind === "split") {
		return node.kind === "group"
			? null
			: {
					kind: "tab",
					id: node.tab.id,
					to: {
						kind: "split",
						splitId: holder.splitId,
						before,
					},
				};
	}

	const to = {
		list: holder.list,
		groupId: holder.kind === "group" ? holder.groupId : null,
		before,
	};
	return node.kind === "group"
		? {
				kind: "group",
				id: node.group.id,
				to,
			}
		: {
				kind: "tab",
				id: node.tab.id,
				to: {
					kind: "list",
					...to,
				},
			};
}

function sectionRows({ list, entries }: SidebarSection): readonly SortRow[] {
	return entries.flatMap((entry) => rowsOf(entry, list, 0));
}

function rowsOf(node: SidebarEntry, list: string, depth: number): readonly SortRow[] {
	const row = {
		sortId: sortIdOf(node),
		entryId: entryIdOf(node),
		list,
		depth,
	};

	if (node.kind === "tab") {
		const isOpen = node.subPages !== undefined && node.subPages.length > 0 && !(node.isFolded ?? false);
		return [
			{
				...row,
				holds: node.subPages === undefined ? null : { kind: "list", list: node.tab.id },
				isOpen,
			},
			...(isOpen ? (node.subPages ?? []).flatMap((subPage) => rowsOf(subPage, list, depth + 1)) : []),
		];
	}

	if (node.kind === "group") {
		const { id, isOpen, items } = node.group;
		return [
			{
				...row,
				holds: {
					kind: "group",
					list,
					groupId: id,
				},
				isOpen,
			},
			...(isOpen ? items.flatMap((item) => rowsOf(item, list, depth + 1)) : []),
		];
	}

	const { id, isShown, members } = node.split;
	return [
		{
			...row,
			holds: {
				kind: "split",
				splitId: id,
			},
			isOpen: isShown,
		},
		...(isShown ? members.flatMap(({ item }) => rowsOf(item, list, depth + 1)) : []),
	];
}
