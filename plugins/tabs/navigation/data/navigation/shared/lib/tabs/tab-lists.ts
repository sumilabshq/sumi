import { SectionListSchema } from "../../schema/tabs.schema.js";
import type { GroupHue, ListEntry, SectionList } from "../../schema/tabs.schema.js";

export interface TabGroup {
	readonly id: string;
	readonly name: string;
	readonly hue: GroupHue | null;
	readonly isOpen: boolean;
	readonly entries: readonly ListEntry[];
}

export type ChatLists = Readonly<Record<string, readonly ListEntry[]>>;

export interface TabLayout {
	readonly lists: ChatLists;
	readonly groups: readonly TabGroup[];
}

export interface TabPlace {
	// TODO: rename chatId → listId, the workspace owns a list too
	readonly chatId: string;
	readonly groupId: string | null;
	readonly before: string | null;
}

export interface TabLocation {
	readonly chatId: string;
	readonly groupId: string | null;
	readonly at: number;
}

export const WORKSPACE_LIST = SectionListSchema.enum.workspace;

export const SECTION_LISTS: readonly string[] = SectionListSchema.options;

export const SECTION_TITLES: Readonly<Record<SectionList, string>> = {
	[WORKSPACE_LIST]: "Recents",
};

export const WORKSPACE_END: TabPlace = {
	chatId: WORKSPACE_LIST,
	groupId: null,
	before: null,
};

const NEW_GROUP = "New group";

const NONE_CLIMBED: ReadonlySet<string> = new Set();

const WINDOW_LIST_PREFIX = "window:";

export function windowListOf(window: string): string {
	return `${WINDOW_LIST_PREFIX}${window}`;
}

export function windowOfList(listId: string): string | null {
	if (!listId.startsWith(WINDOW_LIST_PREFIX)) {
		return null;
	}

	return listId.slice(WINDOW_LIST_PREFIX.length);
}

export function sectionNameOf(listId: string): SectionList | null {
	const parsed = SectionListSchema.safeParse(listId);
	return parsed.success ? parsed.data : null;
}

export function locationOf(layout: TabLayout, tabId: string): TabLocation | null {
	for (const chatId of Object.keys(layout.lists)) {
		const location = topLocationOf(layout, chatId, tabId);

		if (location !== null) {
			return location;
		}
	}

	return groupedLocationOf(layout, tabId);
}

export function chatOfGroup(layout: TabLayout, groupId: string): string | null {
	const climbed = new Set<string>();
	let at = groupId;

	while (!climbed.has(at)) {
		climbed.add(at);
		const listed = listOfEntry(layout.lists, at);

		if (listed !== null) {
			return listed;
		}

		const holder = holdingGroupOf(layout.groups, at);

		if (holder === undefined) {
			return null;
		}

		at = holder.id;
	}

	return null;
}

export function findGroup(groups: readonly TabGroup[], groupId: string): TabGroup | undefined {
	return groups.find((group) => group.id === groupId);
}

export function holdingGroupOf(groups: readonly TabGroup[], groupId: string): TabGroup | undefined {
	return groups.find((group) => group.entries.some((entry) => entry.kind === "group" && entry.id === groupId));
}

export function flatTabIdsOf({ lists, groups }: TabLayout, chatId: string): readonly string[] {
	return tabIdsUnder(groups, lists[chatId] ?? [], NONE_CLIMBED);
}

export function tabIdsOfGroup(groups: readonly TabGroup[], group: TabGroup): readonly string[] {
	return tabIdsUnder(groups, group.entries, new Set([group.id]));
}

export function groupsUnder(
	groups: readonly TabGroup[],
	entries: readonly ListEntry[],
	climbed: ReadonlySet<string> = NONE_CLIMBED,
): readonly TabGroup[] {
	return entries.flatMap((entry) => {
		const group = entry.kind === "group" && !climbed.has(entry.id) ? findGroup(groups, entry.id) : undefined;
		return group === undefined ? [] : [group, ...groupsUnder(groups, group.entries, new Set([...climbed, group.id]))];
	});
}

export function withoutEntry(layout: TabLayout, gone: ListEntry): TabLayout {
	const isKept = (entry: ListEntry): boolean => entry.kind !== gone.kind || entry.id !== gone.id;
	return {
		lists: Object.fromEntries(
			Object.entries(layout.lists).map(([chatId, entries]) => [chatId, entries.filter(isKept)]),
		),
		groups: layout.groups.map((group) =>
			group.entries.every(isKept)
				? group
				: {
						...group,
						entries: group.entries.filter(isKept),
					},
		),
	};
}

export function withEntryAt(layout: TabLayout, entry: ListEntry, place: TabPlace): TabLayout {
	if (place.groupId !== null) {
		return {
			...layout,
			groups: layout.groups.map((group) =>
				group.id === place.groupId
					? {
							...group,
							entries: placedBefore(group.entries, entry, place.before),
						}
					: group,
			),
		};
	}

	return {
		...layout,
		lists: withEntryBefore(layout.lists, place.chatId, entry, place.before),
	};
}

export function withoutTab(layout: TabLayout, tabId: string): TabLayout {
	return withoutEntry(layout, tabEntryOf(tabId));
}

export function withTabAt(layout: TabLayout, tabId: string, place: TabPlace): TabLayout {
	return withEntryAt(layout, tabEntryOf(tabId), place);
}

export function isSectionList(listId: string): boolean {
	return SECTION_LISTS.includes(listId) || windowOfList(listId) !== null;
}

export function withEntryBefore(lists: ChatLists, chatId: string, entry: ListEntry, before: string | null): ChatLists {
	return {
		...lists,
		[chatId]: placedBefore(lists[chatId] ?? [], entry, before),
	};
}

export function tabEntryOf(id: string): ListEntry {
	return {
		kind: "tab",
		id,
	};
}

export function placeAfterOf(layout: TabLayout, tabId: string): TabPlace | null {
	const location = locationOf(layout, tabId);

	if (location === null) {
		return null;
	}

	const container =
		location.groupId === null
			? (layout.lists[location.chatId] ?? [])
			: (findGroup(layout.groups, location.groupId)?.entries ?? []);
	return {
		chatId: location.chatId,
		groupId: location.groupId,
		before: container[location.at + 1]?.id ?? null,
	};
}

export function placeOfLocation(layout: TabLayout, location: TabLocation): TabPlace {
	const group = location.groupId === null ? undefined : findGroup(layout.groups, location.groupId);

	if (group !== undefined) {
		return {
			chatId: location.chatId,
			groupId: group.id,
			before: group.entries[location.at]?.id ?? null,
		};
	}

	return {
		chatId: location.chatId,
		groupId: null,
		before: layout.lists[location.chatId]?.[location.at]?.id ?? null,
	};
}

export function freeGroupNameOf({ lists, groups }: TabLayout, chatId: string): string {
	const names = new Set(groupsUnder(groups, lists[chatId] ?? []).map((group) => group.name));

	if (!names.has(NEW_GROUP)) {
		return NEW_GROUP;
	}

	let ordinal = 2;

	while (names.has(`${NEW_GROUP} ${ordinal}`)) {
		ordinal += 1;
	}

	return `${NEW_GROUP} ${ordinal}`;
}

function placedBefore(items: readonly ListEntry[], item: ListEntry, before: string | null): readonly ListEntry[] {
	const at = before === null ? -1 : items.findIndex((one) => one.id === before);
	const cut = at === -1 ? items.length : at;
	return [...items.slice(0, cut), item, ...items.slice(cut)];
}

function tabIdsUnder(
	groups: readonly TabGroup[],
	entries: readonly ListEntry[],
	climbed: ReadonlySet<string>,
): readonly string[] {
	return entries.flatMap((entry) => {
		if (entry.kind === "tab") {
			return [entry.id];
		}

		const group = climbed.has(entry.id) ? undefined : findGroup(groups, entry.id);
		return group === undefined ? [] : tabIdsUnder(groups, group.entries, new Set([...climbed, group.id]));
	});
}

function listOfEntry(lists: ChatLists, groupId: string): string | null {
	const found = Object.entries(lists).find(([, entries]) =>
		entries.some((entry) => entry.kind === "group" && entry.id === groupId),
	);
	return found?.[0] ?? null;
}

function topLocationOf({ lists }: TabLayout, chatId: string, tabId: string): TabLocation | null {
	const at = (lists[chatId] ?? []).findIndex((entry) => entry.kind === "tab" && entry.id === tabId);

	if (at === -1) {
		return null;
	}

	return {
		chatId,
		groupId: null,
		at,
	};
}

function groupedLocationOf(layout: TabLayout, tabId: string): TabLocation | null {
	for (const group of layout.groups) {
		const at = group.entries.findIndex((entry) => entry.kind === "tab" && entry.id === tabId);
		const chatId = at === -1 ? null : chatOfGroup(layout, group.id);

		if (chatId !== null) {
			return {
				chatId,
				groupId: group.id,
				at,
			};
		}
	}

	return null;
}
