import type { AppTabState, SidebarEntry, SidebarTab, TabChild, TabsSidebar } from "@widgetarium/app-host";

export interface ListedTab {
	readonly tab: AppTabState;
	readonly listTitle: string;
}

export function listedTabsOf(sidebar: TabsSidebar): readonly ListedTab[] {
	return sidebar.sections.flatMap((section) => section.entries.flatMap((entry) => tabsOfEntry(entry, section.title)));
}

export function shownChatIdsOf(sidebar: TabsSidebar): ReadonlySet<string> {
	const items = sidebar.sections.flatMap((section) => section.entries.flatMap(itemsOfEntry));
	return new Set(items.flatMap((item) => (item.children !== undefined && item.tab.isShown ? [item.tab.id] : [])));
}

function tabsOfEntry(entry: SidebarEntry, listTitle: string): readonly ListedTab[] {
	return itemsOfEntry(entry).flatMap((item) => tabsOfItem(item, listTitle));
}

function itemsOfEntry(entry: SidebarEntry): readonly SidebarTab[] {
	if (entry.kind === "group") {
		return entry.group.items;
	}

	return entry.kind === "split" ? entry.split.members.map((member) => member.item) : [entry];
}

function tabsOfItem({ tab, children }: SidebarTab, listTitle: string): readonly ListedTab[] {
	if (children === undefined) {
		return [{ tab, listTitle }];
	}

	return children.flatMap((child) => tabsOfChild(child, tab.title));
}

function tabsOfChild(child: TabChild, listTitle: string): readonly ListedTab[] {
	const tabs = child.kind === "tab" ? [child.tab] : child.group.tabs;
	return tabs.map((tab) => ({ tab, listTitle }));
}
