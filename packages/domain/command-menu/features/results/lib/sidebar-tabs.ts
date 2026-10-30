import type { AppTabState, ChatChild, GroupItem, SidebarEntry, TabsSidebar } from "@widgetarium/app-host";

export interface ListedTab {
	readonly tab: AppTabState;
	readonly listTitle: string;
}

const LIST_TITLES = {
	pinned: "Pinned",
	workspace: "This workspace",
} as const;

export function listedTabsOf(sidebar: TabsSidebar): readonly ListedTab[] {
	return sidebar.sections.flatMap((section) =>
		section.entries.flatMap((entry) => tabsOfEntry(entry, LIST_TITLES[section.list])),
	);
}

export function shownChatIdsOf(sidebar: TabsSidebar): ReadonlySet<string> {
	const items = sidebar.sections.flatMap((section) =>
		section.entries.flatMap((entry) => (entry.kind === "group" ? entry.group.items : [entry])),
	);
	return new Set(items.flatMap((item) => (item.kind === "chat" && item.chat.isShown ? [item.chat.id] : [])));
}

function tabsOfEntry(entry: SidebarEntry, listTitle: string): readonly ListedTab[] {
	if (entry.kind === "group") {
		return entry.group.items.flatMap((item) => tabsOfItem(item, listTitle));
	}

	return tabsOfItem(entry, listTitle);
}

function tabsOfItem(item: GroupItem, listTitle: string): readonly ListedTab[] {
	if (item.kind === "tab") {
		return [{ tab: item.tab, listTitle }];
	}

	return item.chat.children.flatMap((child) => tabsOfChild(child, item.chat.title));
}

function tabsOfChild(child: ChatChild, listTitle: string): readonly ListedTab[] {
	const tabs = child.kind === "tab" ? [child.tab] : child.group.tabs;
	return tabs.map((tab) => ({ tab, listTitle }));
}
