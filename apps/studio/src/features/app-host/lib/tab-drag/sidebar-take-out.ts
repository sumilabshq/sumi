import type {
	EssentialTile,
	SidebarEntry,
	SidebarGroupState,
	SidebarSection,
	SidebarSplitState,
	SidebarTab,
	TabsSidebar,
} from "@widgetarium/app-host/contract";
import type { DragSource } from "./drag-source.js";
import { isSameList } from "./kept-list.js";

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
		return [entry];
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

		return [item];
	});
	return isSameList(kept, items) ? items : kept;
}

function splitWithout(entry: SplitEntry, found: Found): readonly SidebarEntry[] {
	const carried =
		entry.split.id === found.splitId
			? entry.split.members.find((member) => member.item.tab.id === found.id)
			: undefined;

	if (carried === undefined) {
		return [entry];
	}

	found.carry({ kind: "tab", item: carried.item });
	return splitLeftBehind(entry.split, carried, found);
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
