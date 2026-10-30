import type { TabsSidebarQuery } from "@widgetarium/app-host";
import type { OutputOf } from "@widgetarium/core/requests";

export type Sidebar = OutputOf<typeof TabsSidebarQuery>;
type SidebarEntry = Sidebar["sections"][number]["entries"][number];
type SidebarItem = Exclude<SidebarEntry, { kind: "group" }>;
type ChatState = Extract<SidebarItem, { kind: "chat" }>["chat"];
type ChatChild = ChatState["children"][number];
export type SidebarTab = Extract<SidebarItem, { kind: "tab" }>["tab"];

export interface ListedChat {
	readonly kind: "chat";
	readonly id: string;
	readonly title: string;
	readonly mark: ChatState["mark"];
}

export interface ListedGroup {
	readonly kind: "group";
	readonly id: string;
	readonly name: string;
	readonly hue: Extract<SidebarEntry, { kind: "group" }>["group"]["hue"];
	readonly isOpen: boolean;
	readonly tabs: readonly SidebarTab[];
	readonly chats: readonly ListedChat[];
}

export type ListedEntry = { readonly kind: "tab"; readonly tab: SidebarTab } | ListedChat | ListedGroup;

export interface TabList {
	readonly list: string;
	readonly title: string;
	readonly isChat: boolean;
	readonly entries: readonly ListedEntry[];
}

const SECTION_TITLES: Readonly<Record<Sidebar["sections"][number]["list"], string>> = {
	pinned: "Pinned",
	workspace: "Workspace",
};

export function tabListsOf(sidebar: Sidebar): readonly TabList[] {
	const sections = sidebar.sections.map((section) => ({
		list: section.list,
		title: SECTION_TITLES[section.list],
		isChat: false,
		entries: section.entries.map(listedOf),
	}));
	return [...sections, ...chatsIn(sidebar).map(chatListOf)];
}

function chatsIn(sidebar: Sidebar): readonly ChatState[] {
	return sidebar.sections
		.flatMap((section) => section.entries.flatMap((entry) => (entry.kind === "group" ? entry.group.items : [entry])))
		.flatMap((item) => (item.kind === "chat" ? [item.chat] : []));
}

function chatListOf(chat: ChatState): TabList {
	return {
		list: chat.id,
		title: chat.title,
		isChat: true,
		entries: chat.children.map(childOf),
	};
}

function listedOf(entry: SidebarEntry): ListedEntry {
	if (entry.kind === "tab") {
		return entry;
	}

	if (entry.kind === "chat") {
		return chatOf(entry.chat);
	}

	const { items, ...face } = entry.group;
	return {
		kind: "group",
		...face,
		tabs: items.flatMap((item) => (item.kind === "tab" ? [item.tab] : [])),
		chats: items.flatMap((item) => (item.kind === "chat" ? [chatOf(item.chat)] : [])),
	};
}

function childOf(child: ChatChild): ListedEntry {
	if (child.kind === "tab") {
		return child;
	}

	return {
		kind: "group",
		...child.group,
		chats: [],
	};
}

function chatOf(chat: ChatState): ListedChat {
	return {
		kind: "chat",
		id: chat.id,
		title: chat.title,
		mark: chat.mark,
	};
}
