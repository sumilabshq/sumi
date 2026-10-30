import { z } from "zod";
import type { AppTabsQuery } from "@widgetarium/app-host";
import type { ChatListQuery } from "@widgetarium/app-host";
import type { OutputOf } from "@widgetarium/core/requests";
import { tabListsOf } from "./sidebar-lists.js";
import type { ListedEntry, ListedGroup, Sidebar, SidebarTab, TabList } from "./sidebar-lists.js";

export type { Sidebar, SidebarTab } from "./sidebar-lists.js";
export type ChatList = OutputOf<typeof ChatListQuery>;
export type AppTabs = OutputOf<typeof AppTabsQuery>;

export const WORKSPACE = "workspace";
export const PINNED = "pinned";
export const THIS_CHAT = "this-chat";

export const AppStateInputSchema = z.object({
	scope: z.enum([WORKSPACE, THIS_CHAT]).default(WORKSPACE),
});

type AppStateInput = z.infer<typeof AppStateInputSchema>;

interface AppStateSources {
	readonly sidebar: Sidebar;
	readonly chats: ChatList;
	readonly tabs: AppTabs;
}

export type AppState = ReturnType<typeof appStateOf>;

export function appStateOf({ sidebar, chats, tabs }: AppStateSources, chatId: string, { scope }: AppStateInput) {
	const isWorkspace = scope === WORKSPACE;
	const sections = tabListsOf(sidebar)
		.map((section) => sectionOf(section, chatId))
		.filter((section) => isWorkspace || section.place === THIS_CHAT);
	return {
		thisChat: chatId,
		chats: chatsOf(chats, chatId),
		shownTab: tabs.tabs.find((tab) => tab.isShown)?.id ?? null,
		essentials: isWorkspace ? sidebar.essentials.map(({ id, title, isShown }) => ({ id, title, isShown })) : [],
		sections,
	};
}

function chatsOf(chats: ChatList, chatId: string) {
	return [...chats.pinned, ...chats.recents].map((chat) => ({
		id: chat.id,
		title: chat.title,
		isThisChat: chat.id === chatId,
		isPinned: chat.isPinned,
	}));
}

function sectionOf(section: TabList, chatId: string) {
	return {
		place: placeOf(section, chatId),
		list: section.list,
		title: section.title,
		entries: section.entries.map(entryOf),
	};
}

function entryOf(entry: ListedEntry) {
	if (entry.kind === "tab") {
		return { kind: "tab" as const, ...tabOf(entry.tab) };
	}

	return entry.kind === "chat" ? entry : groupOf(entry);
}

function groupOf(group: ListedGroup) {
	return {
		kind: "group" as const,
		id: group.id,
		name: group.name,
		colour: group.hue,
		isOpen: group.isOpen,
		tabs: group.tabs.map(tabOf),
		chats: group.chats,
	};
}

function placeOf(section: TabList, chatId: string): string {
	if (!section.isChat) {
		return section.list;
	}

	return section.list === chatId ? THIS_CHAT : `chat:${section.list}`;
}

function tabOf(tab: SidebarTab) {
	return {
		id: tab.id,
		title: tab.title,
		app: tab.app,
		address: tab.address,
		isShown: tab.isShown,
		isInOwnWindow: tab.isInOwnWindow,
		status: tab.status,
	};
}
