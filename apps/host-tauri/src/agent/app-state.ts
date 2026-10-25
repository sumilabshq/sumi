import { z } from "zod";
import type { AppTabsQuery, TabsSidebarQuery } from "@widgetarium/app-host";
import type { ChatListQuery } from "@widgetarium/workspaces";
import type { OutputOf } from "@widgetarium/core/requests";

export type Sidebar = OutputOf<typeof TabsSidebarQuery>;
export type ChatList = OutputOf<typeof ChatListQuery>;
export type AppTabs = OutputOf<typeof AppTabsQuery>;
type SidebarSection = Sidebar["sections"][number];
type SidebarGroup = Extract<SidebarSection["entries"][number], { kind: "group" }>["group"];
type SidebarTab = Extract<SidebarSection["entries"][number], { kind: "tab" }>["tab"];

const WORKSPACE = "workspace";
const THIS_CHAT = "this-chat";

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
	const sections = sidebar.sections
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

function sectionOf(section: SidebarSection, chatId: string) {
	return {
		place: placeOf(section, chatId),
		list: section.list,
		title: section.title,
		isOpen: section.isOpen,
		entries: section.entries.map((entry) =>
			entry.kind === "tab" ? { kind: "tab", ...tabOf(entry.tab) } : groupOf(entry.group),
		),
	};
}

function groupOf(group: SidebarGroup) {
	return {
		kind: "group",
		id: group.id,
		name: group.name,
		colour: group.hue,
		isOpen: group.isOpen,
		tabs: group.tabs.map(tabOf),
	};
}

function placeOf(section: SidebarSection, chatId: string): string {
	if (section.owner === WORKSPACE) {
		return WORKSPACE;
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
