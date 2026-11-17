import type { TabsSidebar } from "@widgetarium/app-host/contract";

export interface HoldingGroup {
	readonly list: string;
	readonly groupId: string;
}

export function holdingGroupOf(sidebar: TabsSidebar, tabId: string): HoldingGroup | null {
	for (const section of sidebar.sections) {
		for (const entry of section.entries) {
			if (entry.kind === "group" && entry.group.items.some(({ tab }) => tab.id === tabId)) {
				return {
					list: section.list,
					groupId: entry.group.id,
				};
			}
		}
	}

	return null;
}
