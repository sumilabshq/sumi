import type {
	AppTabState,
	SidebarEntry,
	SidebarSection,
	SidebarTab,
	TabChild,
	TabDrop,
	TabsSidebar,
} from "@widgetarium/app-host";
import { keptMap } from "./kept-list.js";
import { insertedBefore, keyedSpot } from "./keyed-spot.js";
import { groupStateOf } from "./sidebar-take-out.js";
import type { Carried } from "./sidebar-take-out.js";
import { tabOfTile, tileOfTab } from "./tile-tab.js";

type ListDrop = Extract<TabDrop, { kind: "list" }>;

type GroupEntry = Extract<SidebarEntry, { kind: "group" }>;

type SplitEntry = Extract<SidebarEntry, { kind: "split" }>;

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
	const entries =
		section.list === drop.list
			? entriesWith(section.entries, carried, drop)
			: keptMap(section.entries, (entry) => entryWithHeld(entry, carried, drop));
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

function entryWithHeld(entry: SidebarEntry, carried: Carried, drop: ListDrop): SidebarEntry {
	if (entry.kind === "tab") {
		return itemWithHeld(entry, carried, drop);
	}

	if (entry.kind === "group") {
		return groupEntryWithHeld(entry, carried, drop);
	}

	return splitEntryWithHeld(entry, carried, drop);
}

function groupEntryWithHeld(entry: GroupEntry, carried: Carried, drop: ListDrop): SidebarEntry {
	const items = keptMap(entry.group.items, (item) => itemWithHeld(item, carried, drop));
	return items === entry.group.items
		? entry
		: {
				kind: "group",
				group: {
					...entry.group,
					items,
				},
			};
}

function splitEntryWithHeld(entry: SplitEntry, carried: Carried, drop: ListDrop): SidebarEntry {
	const members = keptMap(entry.split.members, (member) => {
		const item = itemWithHeld(member.item, carried, drop);
		return item === member.item ? member : { ...member, item };
	});
	return members === entry.split.members
		? entry
		: {
				kind: "split",
				split: {
					...entry.split,
					members,
				},
			};
}

function itemWithHeld(item: SidebarTab, carried: Carried, drop: ListDrop): SidebarTab {
	if (item.tab.id !== drop.list || item.children === undefined) {
		return item;
	}

	return {
		...item,
		children: childrenWith(item.children, carried, drop),
	};
}

function childrenWith(children: readonly TabChild[], carried: Carried, drop: ListDrop): readonly TabChild[] {
	if (drop.groupId === null) {
		return insertedBefore(
			children,
			childOf(carried),
			keyedSpot(drop.before, (child) => [childIdOf(child)]),
		);
	}

	if (carried.kind === "group") {
		return children;
	}

	const { tab } = sidebarTabOf(carried);
	return keptMap(children, (child) => childWithGroupTab(child, tab, drop));
}

function childWithGroupTab(child: TabChild, tab: AppTabState, drop: ListDrop): TabChild {
	if (child.kind !== "group" || child.group.id !== drop.groupId) {
		return child;
	}

	return {
		kind: "group",
		group: {
			...child.group,
			tabs: insertedBefore(
				child.group.tabs,
				tab,
				keyedSpot(drop.before, (one) => [one.id]),
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

function childOf(carried: Carried): TabChild {
	if (carried.kind === "group") {
		return {
			kind: "group",
			group: groupStateOf(carried),
		};
	}

	return {
		kind: "tab",
		tab: sidebarTabOf(carried).tab,
	};
}

function childIdOf(child: TabChild): string {
	return child.kind === "tab" ? child.tab.id : child.group.id;
}
