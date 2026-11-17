import type { AppTabState, SidebarSplitState } from "@widgetarium/app-host/contract";
import type { StripSplit, StripTab } from "@sumi/tab-strip-plugin";

export function tabItemOf(tab: AppTabState, list: string): StripTab {
	return {
		kind: "tab",
		tab,
		list,
		groupId: null,
		group: null,
	};
}

export function splitItemOf(split: SidebarSplitState, list: string): StripSplit | null {
	const focused = split.members.find(({ isFocused }) => isFocused) ?? split.members[0];
	return focused === undefined
		? null
		: {
				kind: "split",
				split,
				focused: focused.item.tab,
				list,
			};
}
