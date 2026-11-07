import type { PageTitle } from "@sumi/apps";
import type { AppTabState, SidebarEntry, SidebarTab, TabsSidebar } from "../../schema/app-tab.schema.js";
import type { ClosedTabRow } from "../../schema/closed-tab.schema.js";

export type PageTitles = ReadonlyMap<string, PageTitle>;

export interface TitledRow {
	readonly app: string;
	readonly title: string;
	readonly favicon: string | null;
}

export interface PageTab {
	readonly id: string;
	readonly app: string;
	readonly address: string | null;
}

export function pageTabsOfSidebar(sidebar: TabsSidebar): readonly PageTab[] {
	return sidebar.sections.flatMap(({ entries }) => entries.flatMap(tabsOfEntry)).map(pageTabOf);
}

export function pageTabsOfRows(tabs: readonly AppTabState[]): readonly PageTab[] {
	return tabs.map(pageTabOf);
}

export function pageTabsOfClosed(rows: readonly ClosedTabRow[]): readonly PageTab[] {
	return rows.map(({ tabId, app, address }) => ({ id: tabId, app, address }));
}

export function titledSidebarOf(sidebar: TabsSidebar, titles: PageTitles): TabsSidebar {
	return {
		...sidebar,
		sections: sidebar.sections.map((section) => ({
			...section,
			entries: section.entries.map((entry) => titledEntryOf(entry, titles)),
		})),
	};
}

export function titledTabOf<T extends AppTabState>(tab: T, titles: PageTitles): T {
	return tab.label === null ? { ...tab, ...titledOf(tab, titles.get(tab.id)) } : tab;
}

export function titledClosedOf(row: ClosedTabRow, titles: PageTitles): ClosedTabRow {
	return { ...row, ...titledOf(row, titles.get(row.tabId)) };
}

function titledOf(row: TitledRow, page: PageTitle | undefined): Pick<TitledRow, "title" | "favicon"> {
	if (page === undefined) {
		return row;
	}

	return {
		title: page.title ?? fallbackTitleOf(row, page),
		favicon: page.favicon ?? row.favicon,
	};
}

function fallbackTitleOf(row: TitledRow, page: PageTitle): string {
	if (row.title !== row.app) {
		return row.title;
	}

	return page.appTitle ?? row.title;
}

function titledEntryOf(entry: SidebarEntry, titles: PageTitles): SidebarEntry {
	if (entry.kind === "tab") {
		return titledItemOf(entry, titles);
	}

	if (entry.kind === "group") {
		return { ...entry, group: { ...entry.group, items: entry.group.items.map((item) => titledItemOf(item, titles)) } };
	}

	return {
		...entry,
		split: {
			...entry.split,
			members: entry.split.members.map((member) => ({ ...member, item: titledItemOf(member.item, titles) })),
		},
	};
}

function titledItemOf(item: SidebarTab, titles: PageTitles): SidebarTab {
	return {
		...item,
		tab: titledTabOf(item.tab, titles),
		children: item.children?.map((child) =>
			child.kind === "tab" ? { ...child, tab: titledTabOf(child.tab, titles) } : child,
		),
	};
}

function tabsOfEntry(entry: SidebarEntry): readonly AppTabState[] {
	if (entry.kind === "tab") {
		return tabsOfItem(entry);
	}

	if (entry.kind === "group") {
		return entry.group.items.flatMap(tabsOfItem);
	}

	return entry.split.members.flatMap(({ item }) => tabsOfItem(item));
}

function tabsOfItem(item: SidebarTab): readonly AppTabState[] {
	const children = (item.children ?? []).flatMap((child) => (child.kind === "tab" ? [child.tab] : []));
	return [item.tab, ...children];
}

function pageTabOf({ id, app, address }: AppTabState): PageTab {
	return { id, app, address };
}
