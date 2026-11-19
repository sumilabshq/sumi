import type { appHost } from "@widgetarium/app-host/contract";
import type { OutputOf } from "@widgetarium/data-framework";

export type Sidebar = OutputOf<typeof appHost.tabs.tabsSidebar>;
type SidebarEntry = Sidebar["sections"][number]["entries"][number];
type SidebarItem = Extract<SidebarEntry, { kind: "tab" }>;
export type SidebarTab = SidebarItem["tab"];

interface ListedGroup {
	readonly kind: "group";
	readonly id: string;
	readonly name: string;
	readonly hue: Extract<SidebarEntry, { kind: "group" }>["group"]["hue"];
	readonly isOpen: boolean;
	readonly tabs: readonly SidebarTab[];
	readonly subPages: ReadonlyMap<string, readonly SidebarTab[]>;
}

export type ListedEntry = { readonly kind: "tab"; readonly tab: SidebarTab; readonly subPages: readonly SidebarTab[] } | ListedGroup;

interface TabList {
	readonly list: string;
	readonly title: string;
	readonly entries: readonly ListedEntry[];
}

export function tabListsOf(sidebar: Sidebar): readonly TabList[] {
	return sidebar.sections.map((section) => ({
		list: section.list,
		title: section.title,
		entries: section.entries.flatMap(listedOf),
	}));
}

function listedOf(entry: SidebarEntry | SidebarItem): readonly ListedEntry[] {
	if (entry.kind === "tab") {
		return [{ kind: "tab", tab: entry.tab, subPages: subPagesOf(entry) }];
	}

	if (entry.kind === "split") {
		return entry.split.members.flatMap((member) => listedOf(member.item));
	}

	return groupsListedOf(entry.group);
}

// TRADE-OFF: a group inside a group is listed flat after its holder; a tree is better, agents read a flat state
function groupsListedOf({ items, ...face }: Extract<SidebarEntry, { kind: "group" }>["group"]): readonly ListedGroup[] {
	return [
		{
			kind: "group",
			...face,
			tabs: items.flatMap((item) => (item.kind === "tab" ? [item.tab] : [])),
			subPages: new Map(items.flatMap((item) => (item.kind === "tab" ? [[item.tab.id, subPagesOf(item)] as const] : []))),
		},
		...items.flatMap((item) => (item.kind === "group" ? groupsListedOf(item.group) : [])),
	];
}

function subPagesOf(item: SidebarItem): readonly SidebarTab[] {
	return (item.subPages ?? []).map(({ tab }) => tab);
}
