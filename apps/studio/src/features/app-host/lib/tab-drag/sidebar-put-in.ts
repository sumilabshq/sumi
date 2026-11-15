import type { SidebarEntry, SidebarSection, SidebarTab, TabDrop, TabsSidebar } from "@widgetarium/app-host/contract";
import { keptMap } from "./kept-list.js";
import { insertedBefore, keyedSpot } from "./keyed-spot.js";
import type { Carried } from "./sidebar-take-out.js";
import { tabOfTile, tileOfTab } from "./tile-tab.js";

type ListDrop = Extract<TabDrop, { kind: "list" }>;

export function putIn(sidebar: TabsSidebar, carried: Carried, drop: TabDrop): TabsSidebar {
	if (drop.kind === "essentials") {
		return withTile(sidebar, carried, drop.at);
	}

	if (drop.kind !== "list") {
		return sidebar;
	}

	return {
		...sidebar,
		sections: keptMap(sidebar.sections, (section) => sectionWith(section, carried, drop)),
	};
}

export function sidebarTabOf(carried: Exclude<Carried, { kind: "group" }>): SidebarTab {
	if (carried.kind === "tab") {
		return carried.item;
	}

	return {
		kind: "tab",
		tab: tabOfTile(carried.tile),
		isChat: false,
	};
}

export function entryKeysOf(entry: SidebarEntry): readonly string[] {
	if (entry.kind === "group") {
		return [entry.group.id];
	}

	return entry.kind === "split" ? entry.split.members.map((member) => member.item.tab.id) : [entry.tab.id];
}

function withTile(sidebar: TabsSidebar, carried: Carried, at: number): TabsSidebar {
	if (carried.kind === "group") {
		return sidebar;
	}

	const tile = carried.kind === "essential" ? carried.tile : tileOfTab(carried.item.tab);
	const cut = Math.min(at, sidebar.essentials.length);
	return {
		...sidebar,
		essentials: [...sidebar.essentials.slice(0, cut), tile, ...sidebar.essentials.slice(cut)],
	};
}

function sectionWith(section: SidebarSection, carried: Carried, drop: ListDrop): SidebarSection {
	if (section.list !== drop.list) {
		return section;
	}

	const entries = entriesWith(section.entries, carried, drop);
	return entries === section.entries
		? section
		: {
				...section,
				entries,
			};
}

function entriesWith(entries: readonly SidebarEntry[], carried: Carried, drop: ListDrop): readonly SidebarEntry[] {
	if (drop.groupId === null) {
		return insertedBefore(entries, entryOf(carried), keyedSpot(drop.before, entryKeysOf));
	}

	if (carried.kind === "group") {
		return entries;
	}

	const item = sidebarTabOf(carried);
	return keptMap(entries, (entry) => entryWithGroupItem(entry, item, drop));
}

function entryWithGroupItem(entry: SidebarEntry, item: SidebarTab, drop: ListDrop): SidebarEntry {
	if (entry.kind !== "group" || entry.group.id !== drop.groupId) {
		return entry;
	}

	return {
		kind: "group",
		group: {
			...entry.group,
			items: insertedBefore(
				entry.group.items,
				item,
				keyedSpot(drop.before, (one) => [one.tab.id]),
			),
		},
	};
}

function entryOf(carried: Carried): SidebarEntry {
	if (carried.kind === "group") {
		return {
			kind: "group",
			group: carried.group,
		};
	}

	return sidebarTabOf(carried);
}
