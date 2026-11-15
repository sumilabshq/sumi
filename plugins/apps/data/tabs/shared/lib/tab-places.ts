import type { Send } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { tabListsOf } from "./tab-lists.js";
import type { ListedEntry, Sidebar, SidebarTab } from "./tab-lists.js";

interface TabSpot {
	readonly id: string;
	readonly list: string;
	readonly groupId: string | null;
	readonly title: string;
	readonly address: string | null;
}

interface ListPlace {
	readonly list: string;
	readonly groupId: string | null;
	readonly before: string | null;
}

const NO_TAB = "No tab {id} stands in a tab list.";
const NO_GROUP = "No group {id} stands in a tab list.";

export function refuseGroup(sidebar: Sidebar, groupId: string): string | null {
	return listOfGroup(sidebar, groupId) === null ? NO_GROUP.replace("{id}", groupId) : null;
}

export function refuseMissingTab(sidebar: Sidebar, tabId: string): string | null {
	return spotOfTab(sidebar, tabId) === null ? missingTabSaid(tabId) : null;
}

export function missingTabSaid(tabId: string): string {
	return NO_TAB.replace("{id}", tabId);
}

export function spotOfTab(sidebar: Sidebar, tabId: string): TabSpot | null {
	return placedTabsOf(sidebar).find((placed) => placed.id === tabId) ?? null;
}

export async function placeTabs(send: Send, tabIds: readonly string[], place: ListPlace): Promise<void> {
	for (const id of tabIds) {
		await send(appHost.tabs.placeTab, {
			id,
			to: {
				kind: "list",
				...place,
			},
		});
	}
}

function listOfGroup(sidebar: Sidebar, groupId: string): string | null {
	const found = tabListsOf(sidebar).find(({ entries }) =>
		entries.some((entry) => entry.kind === "group" && entry.id === groupId),
	);
	return found?.list ?? null;
}

function placedTabsOf(sidebar: Sidebar): readonly TabSpot[] {
	return tabListsOf(sidebar).flatMap(({ list, entries }) => entries.flatMap((entry) => placedInEntry(list, entry)));
}

function placedInEntry(list: string, entry: ListedEntry): readonly TabSpot[] {
	if (entry.kind === "tab") {
		return [spotOf(list, null, entry.tab)];
	}

	return entry.kind === "group" ? entry.tabs.map((tab) => spotOf(list, entry.id, tab)) : [];
}

function spotOf(list: string, groupId: string | null, tab: SidebarTab): TabSpot {
	return {
		id: tab.id,
		list,
		groupId,
		title: tab.title,
		address: tab.address,
	};
}
