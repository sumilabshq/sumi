import type {
	EssentialTile,
	GroupState,
	SidebarEntry,
	SidebarGroupState,
	SidebarSection,
	SidebarSplitState,
	SidebarTab,
	TabChild,
	TabsSidebar,
} from "@widgetarium/app-host";
import type { DragSource } from "./drag-source.js";
import { isSameList, keptMap } from "./kept-list.js";

export type Carried =
	| {
			readonly kind: "tab";
			readonly item: SidebarTab;
	  }
	| {
			readonly kind: "essential";
			readonly tile: EssentialTile;
	  }
	| {
			readonly kind: "group";
			readonly group: SidebarGroupState;
	  };

export interface TakenOut {
	readonly sidebar: TabsSidebar;
	readonly carried: Carried | null;
}

export interface Taking {
	readonly source: DragSource;
	readonly splitId: string | null;
	readonly isLanding: boolean;
}

interface Found {
	readonly id: string;
	readonly splitId: string | null;
	readonly isLanding: boolean;
	readonly carry: (carried: Carried) => void;
	readonly carried: () => Carried | null;
	readonly unmark: (splitId: string) => void;
	readonly unmarked: () => ReadonlySet<string>;
}

type GroupEntry = Extract<SidebarEntry, { kind: "group" }>;

type SplitEntry = Extract<SidebarEntry, { kind: "split" }>;

type SplitMember = SidebarSplitState["members"][number];

type GroupChild = Extract<TabChild, { kind: "group" }>;

export function takenOut(sidebar: TabsSidebar, taking: Taking): TakenOut {
	if (taking.source.kind === "essential") {
		return essentialTakenOut(sidebar, taking.source.id);
	}

	const found = foundOf(taking);
	const sections = sidebar.sections.map((section) => sectionWithout(section, found));
	return {
		sidebar: {
			...sidebar,
			sections: sectionsUnmarked(sections, found.unmarked()),
		},
		carried: found.carried(),
	};
}

export function groupStateOf({ group }: { readonly group: SidebarGroupState }): GroupState {
	return {
		id: group.id,
		name: group.name,
		hue: group.hue,
		isOpen: group.isOpen,
		tabs: group.items.map((item) => item.tab),
	};
}

export function sidebarGroupOf(group: GroupState): SidebarGroupState {
	return {
		id: group.id,
		name: group.name,
		hue: group.hue,
		isOpen: group.isOpen,
		items: group.tabs.map((tab) => ({
			kind: "tab",
			tab,
		})),
	};
}

function essentialTakenOut(sidebar: TabsSidebar, id: string): TakenOut {
	const tile = sidebar.essentials.find((one) => one.id === id);
	return {
		sidebar: {
			...sidebar,
			essentials: sidebar.essentials.filter((one) => one.id !== id),
		},
		carried: tile === undefined ? null : { kind: "essential", tile },
	};
}

function foundOf({ source, splitId, isLanding }: Taking): Found {
	let carried: Carried | null = null;
	const unmarked = new Set<string>();
	return {
		id: source.id,
		splitId,
		isLanding,
		carry: (one) => {
			carried = one;
		},
		carried: () => carried,
		unmark: (splitId) => unmarked.add(splitId),
		unmarked: () => unmarked,
	};
}

function sectionsUnmarked(
	sections: readonly SidebarSection[],
	splitIds: ReadonlySet<string>,
): readonly SidebarSection[] {
	if (splitIds.size === 0) {
		return sections;
	}

	return sections.map((section) => ({
		...section,
		entries: section.entries.map((entry) => entryUnmarked(entry, splitIds)),
	}));
}

function entryUnmarked(entry: SidebarEntry, splitIds: ReadonlySet<string>): SidebarEntry {
	if (entry.kind !== "tab" || !splitIds.has(entry.splitMark?.id ?? "")) {
		return entry;
	}

	return {
		...entry,
		splitMark: null,
	};
}

function sectionWithout(section: SidebarSection, found: Found): SidebarSection {
	const entries = entriesWithout(section.entries, found);
	return entries === section.entries
		? section
		: {
				...section,
				entries,
			};
}

function entriesWithout(entries: readonly SidebarEntry[], found: Found): readonly SidebarEntry[] {
	const kept = entries.flatMap((entry): readonly SidebarEntry[] => entryWithout(entry, found));
	return isSameList(kept, entries) ? entries : kept;
}

function entryWithout(entry: SidebarEntry, found: Found): readonly SidebarEntry[] {
	if (entry.kind === "group") {
		return groupEntryWithout(entry, found);
	}

	if (entry.kind === "split") {
		return splitWithout(entry, found);
	}

	if (entry.tab.id !== found.id) {
		return [itemWithout(entry, found)];
	}

	if (found.splitId === null) {
		found.carry({ kind: "tab", item: entry });
	}

	return [];
}

function groupEntryWithout(entry: GroupEntry, found: Found): readonly SidebarEntry[] {
	const { group } = entry;

	if (group.id === found.id) {
		found.carry({ kind: "group", group });
		return [];
	}

	const items = itemsWithout(group.items, found);
	return [items === group.items ? entry : { kind: "group", group: { ...group, items } }];
}

function itemsWithout(items: readonly SidebarTab[], found: Found): readonly SidebarTab[] {
	const kept = items.flatMap((item) => {
		if (item.tab.id === found.id) {
			found.carry({ kind: "tab", item });
			return [];
		}

		return [itemWithout(item, found)];
	});
	return isSameList(kept, items) ? items : kept;
}

function splitWithout(entry: SplitEntry, found: Found): readonly SidebarEntry[] {
	const carried =
		entry.split.id === found.splitId
			? entry.split.members.find((member) => member.item.tab.id === found.id)
			: undefined;

	if (carried === undefined) {
		return [splitMembersWithout(entry, found)];
	}

	found.carry({ kind: "tab", item: carried.item });
	return splitLeftBehind(entry.split, carried, found);
}

function splitMembersWithout(entry: SplitEntry, found: Found): SidebarEntry {
	const { split } = entry;
	const members = keptMap(split.members, (member) => {
		const item = itemWithout(member.item, found);
		return item === member.item ? member : { ...member, item };
	});
	return members === split.members ? entry : { kind: "split", split: { ...split, members } };
}

function splitLeftBehind(split: SidebarSplitState, carried: SplitMember, found: Found): readonly SidebarEntry[] {
	const members = split.members.filter((member) => member !== carried);
	const [left] = members;

	if (members.length === 1 && left !== undefined) {
		return dissolvedInto(split, left, carried, found);
	}

	return [
		splitEntryOf({
			...split,
			isShown: split.isShown && !(found.isLanding && carried.isFocused),
			members,
		}),
	];
}

function dissolvedInto(
	split: SidebarSplitState,
	left: SplitMember,
	carried: SplitMember,
	found: Found,
): readonly SidebarEntry[] {
	if (!left.isPinned || carried.isPinned) {
		return [{ ...left.item, splitMark: null }];
	}

	found.unmark(split.id);
	return [];
}

function splitEntryOf(split: SidebarSplitState): SplitEntry {
	return {
		kind: "split",
		split,
	};
}

function itemWithout(item: SidebarTab, found: Found): SidebarTab {
	if (item.children === undefined) {
		return item;
	}

	const children = childrenWithout(item.children, found);
	return children === item.children
		? item
		: {
				...item,
				children,
			};
}

function childrenWithout(children: readonly TabChild[], found: Found): readonly TabChild[] {
	const kept = children.flatMap((child) => childWithout(child, found));
	return isSameList(kept, children) ? children : kept;
}

function childWithout(child: TabChild, found: Found): readonly TabChild[] {
	if (child.kind !== "tab") {
		return groupChildWithout(child, found);
	}

	if (child.tab.id !== found.id) {
		return [child];
	}

	found.carry({ kind: "tab", item: { kind: "tab", tab: child.tab } });
	return [];
}

function groupChildWithout(child: GroupChild, found: Found): readonly TabChild[] {
	const { group } = child;

	if (group.id === found.id) {
		found.carry({ kind: "group", group: sidebarGroupOf(group) });
		return [];
	}

	const carried = group.tabs.find((tab) => tab.id === found.id);

	if (carried === undefined) {
		return [child];
	}

	found.carry({ kind: "tab", item: { kind: "tab", tab: carried } });
	return [groupChildWithoutTab(group, found.id)];
}

function groupChildWithoutTab(group: GroupState, id: string): TabChild {
	return {
		kind: "group",
		group: {
			...group,
			tabs: group.tabs.filter((tab) => tab.id !== id),
		},
	};
}
