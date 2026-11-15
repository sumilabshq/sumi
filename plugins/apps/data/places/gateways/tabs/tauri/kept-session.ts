import { MAIN_STUDIO_WINDOW, isPlacesWindowOfWorkspace, placesWindowOf } from "@widgetarium/behaviors";
import type { ListEntry, PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import {
	windowListOf,
	windowOfList,
	windowSectionOf,
	WORKSPACE_LIST,
	PINNED_LIST,
} from "../../../shared/lib/tabs/tab-lists.js";

const MAIN_OPEN = windowListOf(MAIN_STUDIO_WINDOW, WORKSPACE_LIST);

const MAIN_PINNED = windowListOf(MAIN_STUDIO_WINDOW, PINNED_LIST);

export interface ReshapedTabs {
	readonly placed: PlacedTabs;
	readonly reason: string;
}

export function workspacedTabsOf(workspaceId: string): (placed: PlacedTabs) => ReshapedTabs | null {
	return (placed) => {
		const keyOf = (window: string): string =>
			isPlacesWindowOfWorkspace(window) ? window : placesWindowOf(window, workspaceId);
		const listOf = (listId: string): string => {
			const window = windowOfList(listId);
			const section = windowSectionOf(listId);
			return window === null || section === null ? listId : windowListOf(keyOf(window), section);
		};
		const windows = [
			...new Set([
				...Object.keys(placed.views),
				...Object.keys(placed.lists).flatMap((listId) => windowOfList(listId) ?? []),
				...placed.tabs.flatMap((tab) => tab.essentialWindow ?? []),
			]),
		].filter((window) => !isPlacesWindowOfWorkspace(window));

		if (windows.length === 0) {
			return null;
		}

		return {
			placed: {
				...placed,
				lists: Object.entries(placed.lists).reduce<Record<string, ListEntry[]>>((merged, [listId, entries]) => {
					const to = listOf(listId);
					const held = merged[to] ?? [];
					const heldIds = new Set(held.map((entry) => entry.id));
					return { ...merged, [to]: [...held, ...entries.filter((entry) => !heldIds.has(entry.id))] };
				}, {}),
				views: Object.fromEntries(
					Object.entries(placed.views)
						.filter(([window]) => placed.views[keyOf(window)] === undefined || isPlacesWindowOfWorkspace(window))
						.map(([window, view]) => [keyOf(window), view]),
				),
				tabs: placed.tabs.map((tab) =>
					tab.essentialWindow === null ? tab : { ...tab, essentialWindow: keyOf(tab.essentialWindow) },
				),
				closed: placed.closed.map((closed) =>
					closed.chatId === null ? closed : { ...closed, chatId: listOf(closed.chatId) },
				),
			},
			reason: `tabs of windows ${windows.join(", ")} → workspace ${workspaceId} (a window keeps its tabs per workspace)`,
		};
	};
}

export function windowedTabsOf(placed: PlacedTabs): ReshapedTabs | null {
	const { [WORKSPACE_LIST]: open, [PINNED_LIST]: pinned, ...rest } = placed.lists;

	if (open === undefined && pinned === undefined) {
		return null;
	}

	return {
		placed: {
			...placed,
			lists: {
				...rest,
				[MAIN_OPEN]: [...(rest[MAIN_OPEN] ?? []), ...(open ?? [])],
				[MAIN_PINNED]: [...(rest[MAIN_PINNED] ?? []), ...(pinned ?? [])],
			},
		},
		reason: `tabs lists workspace and pinned → window ${MAIN_STUDIO_WINDOW} (${open?.length ?? 0} open, ${pinned?.length ?? 0} pinned; tabs belong to a window now)`,
	};
}
