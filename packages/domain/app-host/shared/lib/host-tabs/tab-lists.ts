import type { TabDrop } from "../../schema/tab-drop.schema.js";
import { WorkspaceListSchema } from "../../schema/tab-group.schema.js";
import type { GroupHue, ListEntry } from "../../schema/tab-group.schema.js";

export interface TabGroup {
	readonly id: string;
	readonly name: string;
	readonly hue: GroupHue | null;
	readonly isOpen: boolean;
	readonly tabIds: readonly string[];
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

export const WORKSPACE_LIST = WorkspaceListSchema.value;

export const WORKSPACE_END: TabPlace = {
	chatId: WORKSPACE_LIST,
	groupId: null,
	before: null,
};

const NEW_GROUP = "New group";

export function locationOf(layout: TabLayout, tabId: string): TabLocation | null {
	for (const chatId of Object.keys(layout.lists)) {
		const location = topLocationOf(layout, chatId, tabId) ?? groupedLocationOf(layout, chatId, tabId);

		if (location !== null) {
			return location;
		}
	}

	return null;
}

export function chatOfGroup({ lists }: TabLayout, groupId: string): string | null {
	const found = Object.entries(lists).find(([, entries]) =>
		entries.some((entry) => entry.kind === "group" && entry.id === groupId),
	);
	return found?.[0] ?? null;
}

export function findGroup(groups: readonly TabGroup[], groupId: string): TabGroup | undefined {
	return groups.find((group) => group.id === groupId);
}

export function flatTabIdsOf({ lists, groups }: TabLayout, chatId: string): readonly string[] {
	return (lists[chatId] ?? []).flatMap((entry) =>
		entry.kind === "tab" ? [entry.id] : (findGroup(groups, entry.id)?.tabIds ?? []),
	);
}

export function withoutTab(layout: TabLayout, tabId: string): TabLayout {
	return {
		lists: listsWithoutTab(layout.lists, tabId),
		groups: layout.groups.map((group) => groupWithoutTab(group, tabId)),
	};
}

export function withTabAt(layout: TabLayout, tabId: string, place: TabPlace): TabLayout {
	if (place.groupId !== null) {
		return {
			...layout,
			groups: layout.groups.map((group) => (group.id === place.groupId ? groupWithTabAt(group, tabId, place) : group)),
		};
	}

	return {
		...layout,
		lists: withEntryBefore(layout.lists, place.chatId, tabEntryOf(tabId), place.before),
	};
}

export function isKnownList({ lists }: TabLayout, listId: string, boardChatIds: readonly string[]): boolean {
	return listId === WORKSPACE_LIST || boardChatIds.includes(listId) || lists[listId] !== undefined;
}

export function listPlaceOf(drop: Extract<TabDrop, { kind: "list" }>): TabPlace {
	return {
		chatId: drop.list,
		groupId: drop.groupId,
		before: drop.before,
	};
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
			? (layout.lists[location.chatId] ?? []).map((entry) => entry.id)
			: (findGroup(layout.groups, location.groupId)?.tabIds ?? []);
	return {
		chatId: location.chatId,
		groupId: location.groupId,
		before: container[location.at + 1] ?? null,
	};
}

export function placeOfLocation(layout: TabLayout, location: TabLocation): TabPlace {
	const group = location.groupId === null ? undefined : findGroup(layout.groups, location.groupId);

	if (group !== undefined) {
		return {
			chatId: location.chatId,
			groupId: group.id,
			before: group.tabIds[location.at] ?? null,
		};
	}

	return {
		chatId: location.chatId,
		groupId: null,
		before: layout.lists[location.chatId]?.[location.at]?.id ?? null,
	};
}

export function freeGroupNameOf({ lists, groups }: TabLayout, chatId: string): string {
	const names = new Set(
		(lists[chatId] ?? []).flatMap((entry) => (entry.kind === "group" ? [findGroup(groups, entry.id)?.name] : [])),
	);

	if (!names.has(NEW_GROUP)) {
		return NEW_GROUP;
	}

	let ordinal = 2;

	while (names.has(`${NEW_GROUP} ${ordinal}`)) {
		ordinal += 1;
	}

	return `${NEW_GROUP} ${ordinal}`;
}

function placedBefore<Item extends string | ListEntry>(
	items: readonly Item[],
	item: Item,
	before: string | null,
): readonly Item[] {
	const at = before === null ? -1 : items.findIndex((one) => idOf(one) === before);
	const cut = at === -1 ? items.length : at;
	return [...items.slice(0, cut), item, ...items.slice(cut)];
}

function idOf(item: string | ListEntry): string {
	return typeof item === "string" ? item : item.id;
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

function groupedLocationOf({ lists, groups }: TabLayout, chatId: string, tabId: string): TabLocation | null {
	for (const entry of (lists[chatId] ?? []).filter((one) => one.kind === "group")) {
		const at = findGroup(groups, entry.id)?.tabIds.indexOf(tabId) ?? -1;

		if (at !== -1) {
			return {
				chatId,
				groupId: entry.id,
				at,
			};
		}
	}

	return null;
}

function listsWithoutTab(lists: ChatLists, tabId: string): ChatLists {
	return Object.fromEntries(
		Object.entries(lists).map(([chatId, entries]) => [
			chatId,
			entries.filter((entry) => entry.kind !== "tab" || entry.id !== tabId),
		]),
	);
}

function groupWithoutTab(group: TabGroup, tabId: string): TabGroup {
	if (!group.tabIds.includes(tabId)) {
		return group;
	}

	return {
		...group,
		tabIds: group.tabIds.filter((id) => id !== tabId),
	};
}

function groupWithTabAt(group: TabGroup, tabId: string, place: TabPlace): TabGroup {
	return {
		...group,
		tabIds: placedBefore(group.tabIds, tabId, place.before),
	};
}
