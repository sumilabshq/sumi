import { treeRowProps } from "@widgetarium/behaviors";

export type TabGroup = "pinned" | "open";

const TABS_SCOPE = "tabs";

export function groupRowProps(group: TabGroup): Readonly<Record<string, string>> {
	return treeRowProps({
		id: group,
		depth: 0,
		canHold: true,
		isHeld: false,
		scope: TABS_SCOPE,
	});
}

export function tabRowProps(id: string): Readonly<Record<string, string>> {
	return treeRowProps({
		id,
		depth: 1,
		canHold: false,
		isHeld: false,
		scope: TABS_SCOPE,
	});
}

export function groupOfPinned(isPinned: boolean): TabGroup {
	return isPinned ? "pinned" : "open";
}
