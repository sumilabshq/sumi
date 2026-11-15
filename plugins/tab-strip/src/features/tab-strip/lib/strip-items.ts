import type { AppTabState, SidebarEntry, SidebarSplitState, TabsSidebar } from "@widgetarium/app-host/contract";

export interface StripGroup {
	readonly id: string;
	readonly name: string;
	readonly hue: string | null;
	readonly isOpen: boolean;
}

export interface StripTab {
	readonly kind: "tab";
	readonly tab: AppTabState;
	readonly list: string;
	readonly groupId: string | null;
	readonly group: StripGroup | null;
	readonly isPinned: boolean;
}

export interface StripSplit {
	readonly kind: "split";
	readonly split: SidebarSplitState;
	readonly focused: AppTabState;
	readonly list: string;
	readonly isPinned: boolean;
}

export type StripItem = StripTab | StripSplit;

export const PINNED_LIST = "pinned";

export function stripItemsOf(sidebar: TabsSidebar): readonly StripItem[] {
	const pinned = sidebar.sections.filter(({ list }) => list === PINNED_LIST);
	const others = sidebar.sections.filter(({ list }) => list !== PINNED_LIST);
	return [...pinned, ...others].flatMap(({ list, entries }) => entries.flatMap((entry) => itemsOfEntry(entry, list)));
}

export function itemIdOf(item: StripItem): string {
	return item.kind === "tab" ? item.tab.id : item.split.id;
}

export function tabOf(item: StripItem): AppTabState {
	return item.kind === "tab" ? item.tab : item.focused;
}

export function memberIdsOf(item: StripItem): readonly string[] {
	return item.kind === "tab" ? [item.tab.id] : item.split.members.map((member) => member.item.tab.id);
}

export function isShownItem(item: StripItem): boolean {
	if (item.kind === "split") {
		return item.split.isShown;
	}

	return item.tab.isShown;
}

export function listedIdOf(item: StripItem): string {
	if (item.kind === "tab") {
		return item.tab.id;
	}

	return item.split.members[0]?.item.tab.id ?? item.focused.id;
}

export function shownTabOf(items: readonly StripItem[]): AppTabState | null {
	const shown = items.find(isShownItem);
	return shown === undefined ? null : tabOf(shown);
}

function itemsOfEntry(entry: SidebarEntry, list: string): readonly StripItem[] {
	const isPinned = list === PINNED_LIST;

	if (entry.kind === "tab") {
		return [
			{
				kind: "tab",
				tab: entry.tab,
				list,
				groupId: null,
				group: null,
				isPinned,
			},
		];
	}

	if (entry.kind === "group") {
		return entry.group.items.map(({ tab }) => ({
			kind: "tab",
			tab,
			list,
			groupId: entry.group.id,
			group: {
				id: entry.group.id,
				name: entry.group.name,
				hue: entry.group.hue,
				isOpen: entry.group.isOpen,
			},
			isPinned,
		}));
	}

	const focused = focusedOf(entry.split);
	return focused === null
		? []
		: [
				{
					kind: "split",
					split: entry.split,
					focused,
					list,
					isPinned,
				},
			];
}

function focusedOf(split: SidebarSplitState): AppTabState | null {
	const member = split.members.find(({ isFocused }) => isFocused) ?? split.members[0];
	return member === undefined ? null : member.item.tab;
}
