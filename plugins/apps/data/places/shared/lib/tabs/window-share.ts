import { SectionListSchema } from "../../schema/tabs.schema.js";
import type { PlacedTabs } from "../../schema/tabs.schema.js";
import { flatTabIdsOf, sectionNameOf, windowListOf, windowOfList } from "./tab-lists.js";
import type { ChatLists, TabLayout } from "./tab-lists.js";

export interface Elsewhere {
	readonly listIds: ReadonlySet<string>;
	readonly tabIds: ReadonlySet<string>;
	readonly groupIds: ReadonlySet<string>;
	readonly splitIds: ReadonlySet<string>;
}

const NOWHERE: Elsewhere = {
	listIds: new Set(),
	tabIds: new Set(),
	groupIds: new Set(),
	splitIds: new Set(),
};

export function elsewhereOf(placed: PlacedTabs, window: string | null): Elsewhere {
	if (window === null) {
		return NOWHERE;
	}

	const roots = Object.keys(placed.lists).filter(
		(listId) => windowOfList(listId) !== null && windowOfList(listId) !== window,
	);
	const listIds = listsHeldUnder(placed, roots);
	const tabIds = new Set([...listIds].flatMap((listId) => flatTabIdsOf(placed, listId)));
	return {
		listIds,
		tabIds,
		groupIds: new Set(
			[...listIds].flatMap((listId) =>
				(placed.lists[listId] ?? []).filter((entry) => entry.kind === "group").map((entry) => entry.id),
			),
		),
		splitIds: new Set(
			placed.splits.filter((split) => split.memberIds.some((id) => tabIds.has(id))).map((split) => split.id),
		),
	};
}

export function shownListsOf(lists: ChatLists, elsewhere: Elsewhere, window: string | null): ChatLists {
	if (window === null) {
		return lists;
	}

	const own = new Map(SectionListSchema.options.map((section) => [windowListOf(window, section), section]));
	return Object.fromEntries(
		Object.entries(lists)
			.filter(([listId]) => !elsewhere.listIds.has(listId))
			.map(([listId, entries]) => [own.get(listId) ?? listId, entries]),
	);
}

export function storedListsOf(lists: ChatLists, window: string | null): ChatLists {
	if (window === null) {
		return lists;
	}

	return Object.fromEntries(
		Object.entries(lists).map(([listId, entries]) => {
			const section = sectionNameOf(listId);
			return [section === null ? listId : windowListOf(window, section), entries];
		}),
	);
}

export function keptElsewhere(lists: ChatLists, elsewhere: Elsewhere): ChatLists {
	return Object.fromEntries(Object.entries(lists).filter(([listId]) => elsewhere.listIds.has(listId)));
}

export function mergedById<Item extends { readonly id: string }>(
	stored: readonly Item[],
	elsewhereIds: ReadonlySet<string>,
	next: readonly Item[],
): readonly Item[] {
	const storedIds = new Set(stored.map((item) => item.id));
	const nextOf = new Map(next.map((item) => [item.id, item]));
	const kept = stored.flatMap((item) => {
		if (elsewhereIds.has(item.id)) {
			return [item];
		}

		const moved = nextOf.get(item.id);
		return moved === undefined ? [] : [moved];
	});
	return [...kept, ...next.filter((item) => !storedIds.has(item.id))];
}

function listsHeldUnder(layout: TabLayout, listIds: readonly string[]): ReadonlySet<string> {
	const deeper = [
		...new Set(
			listIds
				.flatMap((listId) => flatTabIdsOf(layout, listId))
				.filter((id) => layout.lists[id] !== undefined && !listIds.includes(id)),
		),
	];
	return deeper.length === 0 ? new Set(listIds) : listsHeldUnder(layout, [...listIds, ...deeper]);
}
