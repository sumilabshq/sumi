import type { SidebarEntry, SidebarGroupItem, SidebarSection, TabsSidebar } from "@widgetarium/app-host/contract";
import type { SidebarSortAim } from "@widgetarium/kit";
import { entryIdOf, placedOf, sortIdOf } from "./sidebar-drops.js";
import type { Carried, Placed } from "./sidebar-drops.js";

export interface Arranged {
	readonly sidebar: TabsSidebar;
	readonly placed: Placed | null;
}

type Spot =
	| {
			readonly kind: "list";
			readonly list: string;
			readonly groupId: string | null;
			readonly before: string | null;
	  }
	| {
			readonly kind: "split";
			readonly splitId: string;
			readonly before: string | null;
	  };

export function arrangedSidebarOf(sidebar: TabsSidebar, id: string, aim: SidebarSortAim | null): Arranged {
	const carried = carriedOf(sidebar, id);

	if (carried === null || aim === null) {
		return {
			sidebar,
			placed: null,
		};
	}

	const without = {
		...sidebar,
		sections: sidebar.sections.map((section) => ({
			...section,
			entries: entriesWithout(section.entries, id),
		})),
	};
	const placed = placedOf(without, carried, { id, ...aim });
	const spot = placed === null ? null : spotOf(placed);

	if (placed === null || spot === null) {
		return {
			sidebar,
			placed,
		};
	}

	return {
		sidebar: {
			...without,
			sections: without.sections.map((section) => sectionWith(section, carried.node, spot)),
		},
		placed,
	};
}

export function carriedOf(sidebar: TabsSidebar, id: string): Carried | null {
	for (const { entries } of sidebar.sections) {
		const found = carriedAmong(entries, id, 0);

		if (found !== null) {
			return found;
		}
	}

	return null;
}

function carriedAmong(nodes: readonly SidebarEntry[], id: string, depth: number): Carried | null {
	for (const node of nodes) {
		if (node.kind !== "split" && sortIdOf(node) === id) {
			return {
				node,
				depth,
			};
		}

		const inner = node.kind === "tab" ? null : carriedAmong(innerOf(node), id, depth + 1);

		if (inner !== null) {
			return inner;
		}
	}

	return null;
}

function innerOf(node: Exclude<SidebarEntry, { kind: "tab" }>): readonly SidebarGroupItem[] {
	return node.kind === "group" ? node.group.items : node.split.members.map(({ item }) => item);
}

function entriesWithout(entries: readonly SidebarEntry[], id: string): readonly SidebarEntry[] {
	return entries.flatMap((entry): readonly SidebarEntry[] => {
		if (entry.kind !== "split") {
			return itemsWithout([entry], id);
		}

		return [
			{
				...entry,
				split: {
					...entry.split,
					members: entry.split.members.filter(({ item }) => item.tab.id !== id),
				},
			},
		];
	});
}

function itemsWithout(items: readonly SidebarGroupItem[], id: string): readonly SidebarGroupItem[] {
	return items.flatMap((item): readonly SidebarGroupItem[] => {
		if (sortIdOf(item) === id) {
			return [];
		}

		if (item.kind === "tab") {
			return [item];
		}

		return [
			{
				...item,
				group: {
					...item.group,
					items: itemsWithout(item.group.items, id),
				},
			},
		];
	});
}

function spotOf(placed: Placed): Spot | null {
	if (placed.kind === "group") {
		return {
			kind: "list",
			...placed.to,
		};
	}

	return placed.to.kind === "own-window" ? null : placed.to;
}

function sectionWith(section: SidebarSection, node: SidebarGroupItem, spot: Spot): SidebarSection {
	if (spot.kind === "split") {
		return {
			...section,
			entries: section.entries.map((entry) => splitWith(entry, node, spot)),
		};
	}

	if (spot.list !== section.list) {
		return section;
	}

	const { groupId, before } = spot;
	return {
		...section,
		entries:
			groupId === null
				? insertedBefore(section.entries, node, before)
				: section.entries.map((entry) => (entry.kind === "group" ? groupWith(entry, node, { groupId, before }) : entry)),
	};
}

function splitWith(entry: SidebarEntry, node: SidebarGroupItem, spot: Extract<Spot, { kind: "split" }>): SidebarEntry {
	if (entry.kind !== "split" || entry.split.id !== spot.splitId || node.kind !== "tab") {
		return entry;
	}

	const at = spot.before === null ? -1 : entry.split.members.findIndex(({ item }) => item.tab.id === spot.before);
	const cut = at === -1 ? entry.split.members.length : at;
	const member = {
		item: node,
		isFocused: false,
	};
	return {
		...entry,
		split: {
			...entry.split,
			members: [...entry.split.members.slice(0, cut), member, ...entry.split.members.slice(cut)],
		},
	};
}

function groupWith<Group extends Extract<SidebarGroupItem, { kind: "group" }>>(
	entry: Group,
	node: SidebarGroupItem,
	spot: { readonly groupId: string; readonly before: string | null },
): Group {
	return {
		...entry,
		group: {
			...entry.group,
			items:
				entry.group.id === spot.groupId
					? insertedBefore(entry.group.items, node, spot.before)
					: entry.group.items.map((item) => (item.kind === "group" ? groupWith(item, node, spot) : item)),
		},
	};
}

function insertedBefore<Node extends SidebarEntry>(nodes: readonly Node[], added: Node, before: string | null): readonly Node[] {
	const at = before === null ? -1 : nodes.findIndex((node) => entryIdOf(node) === before);
	return at === -1 ? [...nodes, added] : [...nodes.slice(0, at), added, ...nodes.slice(at)];
}
