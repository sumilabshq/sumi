import type { Send } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { tabListsOf } from "./tab-lists.js";
import type { ListedEntry, Sidebar, SidebarTab } from "./tab-lists.js";

const WORKSPACE = "workspace";
const PINNED = "pinned";
const THIS_CHAT = "this-chat";

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

const SHARED_LISTS: ReadonlySet<string> = new Set([WORKSPACE, PINNED]);
const NO_TAB = "No tab {id} stands in a tab list.";
const NO_GROUP = "No group {id} stands in a tab list.";
const FOREIGN = "{what} belongs to another chat. Sumi reads and copies from other chats but never changes them.";

export function listOfPlace(place: string, chatId: string): string {
	return place === THIS_CHAT ? chatId : place;
}

export function placeOfList(list: string, chatId: string): string {
	return list === chatId ? THIS_CHAT : list;
}

export function refusePlace(place: string, chatId: string): string | null {
	return refuseForeign(listOfPlace(place, chatId), chatId, `The place ${place}`);
}

export function refuseTab(sidebar: Sidebar, tabId: string, chatId: string): string | null {
	const owned = ownTabOf(sidebar, tabId, chatId);
	return typeof owned === "string" ? owned : null;
}

export function ownTabOf(sidebar: Sidebar, tabId: string, chatId: string): TabSpot | string {
	const spot = spotOfTab(sidebar, tabId);

	if (spot === null) {
		return NO_TAB.replace("{id}", tabId);
	}

	return refuseForeign(spot.list, chatId, `The tab ${tabId}`) ?? spot;
}

export function refuseGroup(sidebar: Sidebar, groupId: string, chatId: string): string | null {
	const list = listOfGroup(sidebar, groupId);

	if (list === null) {
		return NO_GROUP.replace("{id}", groupId);
	}

	return refuseForeign(list, chatId, `The group ${groupId}`);
}

export function refuseMissingTab(sidebar: Sidebar, tabId: string): string | null {
	return spotOfTab(sidebar, tabId) === null ? NO_TAB.replace("{id}", tabId) : null;
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

function refuseForeign(list: string, chatId: string, what: string): string | null {
	if (list === chatId || SHARED_LISTS.has(list)) {
		return null;
	}

	return FOREIGN.replace("{what}", what);
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
