import type { TabsSidebarQuery } from "@widgetarium/app-host";
import type { OutputOf } from "@widgetarium/core/requests";

export type Sidebar = OutputOf<typeof TabsSidebarQuery>;
type SidebarEntry = Sidebar["sections"][number]["entries"][number];
type SidebarItem = Exclude<SidebarEntry, { kind: "group" | "split" }>;
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
		entries: section.entries.flatMap(listedOf),
	}));
	return [...sections, ...chatsIn(sidebar).map(chatListOf)];
}

function chatsIn(sidebar: Sidebar): readonly ChatState[] {
	return sidebar.sections
		.flatMap((section) => section.entries.flatMap(itemsOfEntry))
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

function listedOf(entry: SidebarEntry | SidebarItem): readonly ListedEntry[] {
	if (entry.kind === "tab") {
		return [entry];
	}

	if (entry.kind === "chat") {
		return [chatOf(entry.chat)];
	}

	if (entry.kind === "split") {
		return entry.split.members.flatMap((member) => listedOf(member.item));
	}

	return [groupListedOf(entry.group)];
}

function groupListedOf({ items, ...face }: Extract<SidebarEntry, { kind: "group" }>["group"]): ListedGroup {
	return {
		kind: "group",
		...face,
		tabs: items.flatMap((item) => (item.kind === "tab" ? [item.tab] : [])),
		chats: items.flatMap((item) => (item.kind === "chat" ? [chatOf(item.chat)] : [])),
	};
}

function itemsOfEntry(entry: SidebarEntry): readonly SidebarItem[] {
	if (entry.kind === "group") {
		return entry.group.items;
	}

	return entry.kind === "split" ? entry.split.members.map((member) => member.item) : [entry];
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
