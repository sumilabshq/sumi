import type { SidebarEntry, SidebarSection, SidebarTab, TabDrop, TabsSidebar } from "@widgetarium/app-host/contract";
import type { SidebarSortAim } from "@widgetarium/kit";
import { placedTabOf } from "./sidebar-drops.js";
import type { PlacedTab } from "./sidebar-drops.js";

export interface Arranged {
	readonly sidebar: TabsSidebar;
	readonly placed: PlacedTab | null;
}

export function arrangedSidebarOf(sidebar: TabsSidebar, id: string, aim: SidebarSortAim | null): Arranged {
	const carried = carriedTabOf(sidebar, id);

	if (carried === null) {
		return {
			sidebar,
			placed: null,
		};
	}

	const without = {
		...sidebar,
		sections: sidebar.sections.map((section) => takenOut(section, id)),
	};
	const placed = aim === null ? null : placedTabOf(without, { id, ...aim });

	if (placed === null) {
		return {
			sidebar,
			placed: null,
		};
	}

	return {
		sidebar: {
			...without,
			sections: without.sections.map((section) => placedIn(section, carried, placed.to)),
		},
		placed,
	};
}

function carriedTabOf(sidebar: TabsSidebar, id: string): SidebarTab | null {
	for (const entry of sidebar.sections.flatMap(({ entries }) => entries)) {
		const found = tabsOf(entry).find(({ tab }) => tab.id === id);

		if (found !== undefined) {
			return found;
		}
	}

	return null;
}

function tabsOf(entry: SidebarEntry): readonly SidebarTab[] {
	if (entry.kind === "tab") {
		return [entry];
	}

	return entry.kind === "group" ? entry.group.items : entry.split.members.map(({ item }) => item);
}

function takenOut(section: SidebarSection, id: string): SidebarSection {
	return {
		...section,
		entries: section.entries.flatMap((entry): SidebarEntry[] => {
			if (entry.kind === "tab") {
				return entry.tab.id === id ? [] : [entry];
			}

			if (entry.kind === "group") {
				return [{ ...entry, group: { ...entry.group, items: entry.group.items.filter(({ tab }) => tab.id !== id) } }];
			}

			return [
				{
					...entry,
					split: { ...entry.split, members: entry.split.members.filter(({ item }) => item.tab.id !== id) },
				},
			];
		}),
	};
}

function placedIn(section: SidebarSection, carried: SidebarTab, to: TabDrop): SidebarSection {
	if (to.kind === "own-window") {
		return section;
	}

	if (to.kind === "split") {
		return {
			...section,
			entries: section.entries.map((entry) => {
				if (entry.kind !== "split" || entry.split.id !== to.splitId) {
					return entry;
				}

				const member = {
					item: carried,
					isFocused: false,
				};
				return { ...entry, split: { ...entry.split, members: insertedBefore(entry.split.members, member, to.before, ({ item }) => item.tab.id) } };
			}),
		};
	}

	if (to.list !== section.list) {
		return section;
	}

	if (to.groupId !== null) {
		const { groupId } = to;
		return {
			...section,
			entries: section.entries.map((entry) =>
				entry.kind === "group" && entry.group.id === groupId
					? { ...entry, group: { ...entry.group, items: insertedBefore(entry.group.items, carried, to.before, ({ tab }) => tab.id) } }
					: entry,
			),
		};
	}

	return {
		...section,
		entries: insertedBefore(section.entries, carried, to.before, (entry) => tabsOf(entry)[0]?.tab.id ?? null),
	};
}

function insertedBefore<T>(list: readonly T[], added: T, beforeId: string | null, idOf: (one: T) => string | null): T[] {
	const at = beforeId === null ? -1 : list.findIndex((one) => idOf(one) === beforeId);
	return at === -1 ? [...list, added] : [...list.slice(0, at), added, ...list.slice(at)];
}
