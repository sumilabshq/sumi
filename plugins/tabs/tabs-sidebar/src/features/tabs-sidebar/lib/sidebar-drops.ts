import type { SidebarSortDrop } from "@widgetarium/kit";
import type { SidebarEntry, SidebarSection, TabDrop, TabsSidebar } from "@widgetarium/app-host/contract";

export const GROUP_ROW = "group:";
export const SPLIT_ROW = "split:";

export interface PlacedTab {
	readonly id: string;
	readonly to: TabDrop;
}

type SpotPair = readonly [string, DropSpot];

interface DropSpot {
	readonly before: TabDrop;
	readonly after: TabDrop;
	readonly into: TabDrop | null;
}

export function placedTabOf(sidebar: TabsSidebar, { id, targetId, place }: SidebarSortDrop): PlacedTab | null {
	const spot = spotsOf(sidebar).get(targetId);

	if (spot === undefined || id.startsWith(GROUP_ROW) || id.startsWith(SPLIT_ROW)) {
		return null;
	}

	const to = place === "into" ? spot.into : spot[place];
	return to === null ? null : { id, to };
}

function spotsOf(sidebar: TabsSidebar): ReadonlyMap<string, DropSpot> {
	return new Map(sidebar.sections.flatMap((section) => sectionSpots(section)));
}

function sectionSpots({ list, entries }: SidebarSection): SpotPair[] {
	return entries.flatMap((entry, index): SpotPair[] => {
		const before = listDrop(list, null, listedIdOf(entry));
		const after = listDrop(list, null, listedIdOf(entries[index + 1]));

		if (entry.kind === "tab") {
			return [spotOf(entry.tab.id, before, after, null)];
		}

		if (entry.kind === "group") {
			const { id, items } = entry.group;
			return [
				spotOf(`${GROUP_ROW}${id}`, before, after, listDrop(list, id, null)),
				...items.map(({ tab }, at) =>
					spotOf(tab.id, listDrop(list, id, tab.id), listDrop(list, id, items[at + 1]?.tab.id ?? null), null),
				),
			];
		}

		const { id, members } = entry.split;
		return [
			spotOf(`${SPLIT_ROW}${id}`, before, after, splitDrop(id, null)),
			...members.map(({ item }, at) =>
				spotOf(item.tab.id, splitDrop(id, item.tab.id), splitDrop(id, members[at + 1]?.item.tab.id ?? null), null),
			),
		];
	});
}

function spotOf(id: string, before: TabDrop, after: TabDrop, into: TabDrop | null): SpotPair {
	return [
		id,
		{
			before,
			after,
			into,
		},
	];
}

function listedIdOf(entry: SidebarEntry | undefined): string | null {
	if (entry === undefined) {
		return null;
	}

	if (entry.kind === "tab") {
		return entry.tab.id;
	}

	if (entry.kind === "group") {
		return entry.group.items[0]?.tab.id ?? null;
	}

	return entry.split.members[0]?.item.tab.id ?? null;
}

function listDrop(list: string, groupId: string | null, before: string | null): TabDrop {
	return {
		kind: "list",
		list,
		groupId,
		before,
	};
}

function splitDrop(splitId: string, before: string | null): TabDrop {
	return {
		kind: "split",
		splitId,
		before,
	};
}
