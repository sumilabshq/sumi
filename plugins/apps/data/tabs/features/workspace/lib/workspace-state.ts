import type { appHost } from "@widgetarium/app-host/contract";
import type { chatTabs } from "@sumi/chat-tabs/contract";
import type { OutputOf } from "@widgetarium/data-framework";
import { placeOfList } from "../../../shared/lib/tab-places.js";
import { tabListsOf } from "../../../shared/lib/tab-lists.js";
import type { ListedEntry, Sidebar, SidebarTab } from "../../../shared/lib/tab-lists.js";
import type { StateScope, WorkspaceState } from "../../../shared/schema/workspace.schema.js";

type ChatList = OutputOf<typeof chatTabs.chatList.all>;
type AppTabs = OutputOf<typeof appHost.tabs.appTabs>;
type TabList = ReturnType<typeof tabListsOf>[number];
type ListedGroup = Extract<ListedEntry, { readonly kind: "group" }>;
type StateEntry = WorkspaceState["sections"][number]["entries"][number];

export interface StateSources {
	readonly sidebar: Sidebar;
	readonly chats: ChatList;
	readonly tabs: AppTabs;
}

export function workspaceStateOf(
	{ sidebar, chats, tabs }: StateSources,
	chatId: string,
	{ scope }: StateScope,
): WorkspaceState {
	const isWorkspace = scope === "workspace";
	return {
		thisChat: chatId,
		chats: chatsOf(chats, chatId),
		shownTab: tabs.tabs.find((tab) => tab.isShown)?.id ?? null,
		essentials: isWorkspace ? sidebar.essentials.map(({ id, title, isShown }) => ({ id, title, isShown })) : [],
		sections: sectionsOf(sidebar, chatId, isWorkspace),
	};
}

function sectionsOf(sidebar: Sidebar, chatId: string, isWorkspace: boolean): WorkspaceState["sections"] {
	return tabListsOf(sidebar)
		.filter((section) => isWorkspace || section.list === chatId)
		.map((section) => sectionOf(section, chatId));
}

function chatsOf(chats: ChatList, chatId: string): WorkspaceState["chats"] {
	return [...chats.pinned, ...chats.recents].map((chat) => ({
		id: chat.id,
		title: chat.title,
		isThisChat: chat.id === chatId,
		isPinned: chat.isPinned,
	}));
}

function sectionOf(section: TabList, chatId: string): WorkspaceState["sections"][number] {
	return {
		place: placeOf(section, chatId),
		list: section.list,
		title: section.title,
		entries: section.entries.map(entryOf),
	};
}

function entryOf(entry: ListedEntry): StateEntry {
	if (entry.kind === "tab") {
		return {
			kind: "tab",
			...tabOf(entry.tab),
		};
	}

	return entry.kind === "chat" ? entry : groupOf(entry);
}

function groupOf(group: ListedGroup): StateEntry {
	return {
		kind: "group",
		id: group.id,
		name: group.name,
		colour: group.hue,
		isOpen: group.isOpen,
		tabs: group.tabs.map(tabOf),
		chats: [...group.chats],
	};
}

function placeOf(section: TabList, chatId: string): string {
	if (!section.isChat || section.list === chatId) {
		return placeOfList(section.list, chatId);
	}

	return `chat:${section.list}`;
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
