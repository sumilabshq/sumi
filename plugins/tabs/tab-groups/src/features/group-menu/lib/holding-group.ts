import type { SidebarGroupItem, TabsSidebar } from "@widgetarium/app-host/contract";

export interface HoldingGroup {
	readonly list: string;
	readonly groupId: string;
	readonly outerGroupId: string | null;
}

export function holdingGroupOf(sidebar: TabsSidebar, tabId: string): HoldingGroup | null {
	for (const section of sidebar.sections) {
		const found = holdingAmong(section.entries.flatMap((entry) => (entry.kind === "group" ? [entry] : [])), tabId, null);

		if (found !== null) {
			return {
				...found,
				list: section.list,
			};
		}
	}

	return null;
}

function holdingAmong(
	items: readonly SidebarGroupItem[],
	tabId: string,
	outerGroupId: string | null,
): Omit<HoldingGroup, "list"> | null {
	for (const item of items) {
		if (item.kind !== "group") {
			continue;
		}

		if (item.group.items.some((one) => one.kind === "tab" && one.tab.id === tabId)) {
			return {
				groupId: item.group.id,
				outerGroupId,
			};
		}

		const deeper = holdingAmong(item.group.items, tabId, item.group.id);

		if (deeper !== null) {
			return deeper;
		}
	}

	return null;
}
