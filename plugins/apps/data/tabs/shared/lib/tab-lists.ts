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
}

export type ListedEntry = { readonly kind: "tab"; readonly tab: SidebarTab } | ListedGroup;

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
		return [entry];
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
		},
		...items.flatMap((item) => (item.kind === "group" ? groupsListedOf(item.group) : [])),
	];
}
