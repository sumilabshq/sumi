import type { SidebarEntry, SidebarGroupItem, SidebarSection, TabsSidebar } from "@widgetarium/app-host/contract";
import type { SidebarSortAim } from "@widgetarium/kit";
import { aimedOf, entryIdOf, placedIn, sortIdOf } from "./sidebar-drops.js";
import type { Carried, Holder, Placed } from "./sidebar-drops.js";

export interface Arranged {
	readonly sidebar: TabsSidebar;
	readonly placed: Placed | null;
	readonly holder: Holder | null;
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
			holder: null,
		};
	}

	const without = {
		...sidebar,
		sections: sidebar.sections.map((section) => ({
			...section,
			entries: entriesWithout(section.entries, id),
		})),
	};
	const aimed = aimedOf(without, carried, { id, ...aim });
	const placed = aimed === null ? null : placedIn(carried.node, aimed);
	const holder = aimed?.holder ?? null;
	const spot = placed === null ? null : spotOf(placed);

	if (placed === null || spot === null) {
		return {
			sidebar,
			placed,
			holder,
		};
	}

	return {
		sidebar: {
			...without,
			sections: without.sections.map((section) => sectionWith(section, carried.node, spot)),
		},
		placed,
		holder,
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
		if (sortIdOf(node) === id) {
			return {
				node,
				depth,
			};
		}

		const inner = carriedAmong(innerOf(node), id, depth + 1);

		if (inner !== null) {
			return inner;
		}
	}

	return null;
}

function innerOf(node: SidebarEntry): readonly SidebarGroupItem[] {
	if (node.kind === "tab") {
		return node.subPages ?? [];
	}

	return node.kind === "group" ? node.group.items : node.split.members.map(({ item }) => item);
}

function entriesWithout(entries: readonly SidebarEntry[], id: string): readonly SidebarEntry[] {
	return itemsWithout(entries, id);
}

function itemsWithout(items: readonly SidebarGroupItem[], id: string): readonly SidebarGroupItem[] {
	return items.flatMap((item): readonly SidebarGroupItem[] => {
		if (sortIdOf(item) === id) {
			return [];
		}

		if (item.kind === "tab") {
			return [item.subPages === undefined ? item : { ...item, subPages: item.subPages.filter(({ tab }) => tab.id !== id) }];
		}

		if (item.kind === "split") {
			return [{ ...item, split: { ...item.split, members: item.split.members.filter((member) => member.item.tab.id !== id) } }];
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
	if (placed.kind !== "tab") {
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
		return node.kind === "tab"
			? {
					...section,
					entries: section.entries.map((entry) => pageWith(entry, node, spot)),
				}
			: section;
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

function splitWith<Item extends SidebarGroupItem>(entry: Item, node: SidebarGroupItem, spot: Extract<Spot, { kind: "split" }>): Item {
	if (entry.kind === "group") {
		return { ...entry, group: { ...entry.group, items: entry.group.items.map((inner) => splitWith(inner, node, spot)) } };
	}

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

function pageWith<Item extends SidebarGroupItem>(
	item: Item,
	node: Extract<SidebarGroupItem, { kind: "tab" }>,
	spot: { readonly list: string; readonly before: string | null },
): Item {
	if (item.kind === "group") {
		return {
			...item,
			group: {
				...item.group,
				items: item.group.items.map((inner) => pageWith(inner, node, spot)),
			},
		};
	}

	if (item.kind === "split" || item.tab.id !== spot.list || item.subPages === undefined) {
		return item;
	}

	const subPage = {
		kind: "tab" as const,
		tab: node.tab,
	};
	return {
		...item,
		subPages: insertedBefore(item.subPages, subPage, spot.before),
	};
}
