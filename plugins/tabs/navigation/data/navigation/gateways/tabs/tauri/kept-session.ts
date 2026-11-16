import { MAIN_STUDIO_WINDOW, isPlacesWindowOfWorkspace, placesWindowOf } from "@widgetarium/behaviors";
import type { ListEntry, PlacedTabs } from "../../../shared/schema/tabs.schema.js";
import { windowListOf, windowOfList, WORKSPACE_LIST } from "../../../shared/lib/tabs/tab-lists.js";

const MAIN_OPEN = windowListOf(MAIN_STUDIO_WINDOW);

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
			return window === null ? listId : windowListOf(keyOf(window));
		};
		const windows = [
			...new Set([
				...Object.keys(placed.views),
				...Object.keys(placed.lists).flatMap((listId) => windowOfList(listId) ?? []),
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
				closed: placed.closed.map((closed) =>
					closed.chatId === null ? closed : { ...closed, chatId: listOf(closed.chatId) },
				),
			},
			reason: `tabs of windows ${windows.join(", ")} → workspace ${workspaceId} (a window keeps its tabs per workspace)`,
		};
	};
}

export function windowedTabsOf(placed: PlacedTabs): ReshapedTabs | null {
	const { [WORKSPACE_LIST]: open, ...rest } = placed.lists;

	if (open === undefined) {
		return null;
	}

	return {
		placed: {
			...placed,
			lists: {
				...rest,
				[MAIN_OPEN]: [...(rest[MAIN_OPEN] ?? []), ...open],
			},
		},
		reason: `tabs list workspace → window ${MAIN_STUDIO_WINDOW} (${open.length} open; tabs belong to a window now)`,
	};
}
