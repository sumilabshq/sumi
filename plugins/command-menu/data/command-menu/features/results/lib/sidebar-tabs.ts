import type { AppTabState, SidebarEntry, SidebarTab, TabsSidebar } from "@widgetarium/app-host/contract";

export interface ListedTab {
	readonly tab: AppTabState;
	readonly listTitle: string;
}

export function listedTabsOf(sidebar: TabsSidebar): readonly ListedTab[] {
	return sidebar.sections.flatMap((section) => section.entries.flatMap((entry) => tabsOfEntry(entry, section.title)));
}

export function shownChatIdsOf(sidebar: TabsSidebar): ReadonlySet<string> {
	const items = sidebar.sections.flatMap((section) => section.entries.flatMap(itemsOfEntry));
	return new Set(items.flatMap((item) => (item.isChat && item.tab.isShown ? [item.tab.id] : [])));
}

export function shownSplitIdsOf(sidebar: TabsSidebar): readonly string[] {
	const entries = sidebar.sections.flatMap((section) => section.entries);
	const shown = entries.find((entry) => entry.kind === "split" && entry.split.isShown);
	return shown?.kind === "split" ? shown.split.members.map((member) => member.item.tab.id) : [];
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

function tabsOfItem({ tab, isChat }: SidebarTab, listTitle: string): readonly ListedTab[] {
	return isChat ? [] : [{ tab, listTitle }];
}
