import type { AppTabState, SidebarGroupItem, SidebarTab, TabsSidebar } from "@widgetarium/app-host/contract";

export type PageEntry = SidebarTab & { readonly subPages: NonNullable<SidebarTab["subPages"]> };

export interface MainPage {
	readonly page: PageEntry;
	readonly list: string;
}

export function pageEntryOf(sidebar: TabsSidebar, tabId: string): PageEntry | null {
	return pageEntriesOf(sidebar).find((page) => page.tab.id === tabId) ?? null;
}

export function pageEntriesOf(sidebar: TabsSidebar): readonly PageEntry[] {
	return sidebar.sections
		.flatMap(({ entries }) =>
			entries.flatMap((entry) =>
				entry.kind === "split" ? entry.split.members.map(({ item }) => item) : itemsUnder(entry),
			),
		)
		.filter(isPageEntry);
}

export function mainPageOf(sidebar: TabsSidebar, tabId: string): MainPage | null {
	for (const section of sidebar.sections) {
		const page = pageEntriesOf({ ...sidebar, sections: [section] }).find(({ subPages }) =>
			subPages.some(({ tab }) => tab.id === tabId),
		);

		if (page !== undefined) {
			return {
				page,
				list: section.list,
			};
		}
	}

	return null;
}

export function shownTabOf(sidebar: TabsSidebar): AppTabState | null {
	const shown = pageEntriesOf(sidebar)
		.flatMap((page) => [page.tab, ...page.subPages.map(({ tab }) => tab)])
		.find((tab) => tab.isShown);
	return shown ?? null;
}

export function isChatTab(tab: AppTabState): boolean {
	return tab.icon === "chat";
}

function itemsUnder(item: SidebarGroupItem): readonly SidebarTab[] {
	return item.kind === "tab" ? [item] : item.group.items.flatMap(itemsUnder);
}

function isPageEntry(tab: SidebarTab): tab is PageEntry {
	return tab.subPages !== undefined;
}
