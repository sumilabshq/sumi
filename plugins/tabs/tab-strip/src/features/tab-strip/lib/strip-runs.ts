import type { SidebarEntry, TabsSidebar } from "@widgetarium/app-host/contract";
import { itemsOfEntry } from "./strip-items.js";
import type { StripGroup, StripItem, StripSplit, StripTab } from "./strip-items.js";

export type StripRun =
	| {
			readonly kind: "item";
			readonly item: StripItem;
	  }
	| {
			readonly kind: "group";
			readonly group: StripGroup;
			readonly tabs: readonly StripTab[];
	  }
	| {
			readonly kind: "split";
			readonly split: StripSplit;
	  };

export function stripRunsOf(sidebar: TabsSidebar): readonly StripRun[] {
	return sidebar.sections.flatMap(({ list, entries }) => entries.flatMap((entry) => runsOfEntry(entry, list)));
}

export function runIdOf(run: StripRun): string {
	if (run.kind === "item") {
		return run.item.kind === "tab" ? run.item.tab.id : run.item.split.id;
	}

	return run.kind === "group" ? run.group.id : run.split.split.id;
}

function runsOfEntry(entry: SidebarEntry, list: string): readonly StripRun[] {
	const items = itemsOfEntry(entry, list);

	if (entry.kind === "group") {
		return [
			{
				kind: "group",
				group: {
					id: entry.group.id,
					name: entry.group.name,
					hue: entry.group.hue,
					isOpen: entry.group.isOpen,
				},
				tabs: items.filter(isTabItem),
			},
		];
	}

	return items.map((item) => (item.kind === "split" ? { kind: "split", split: item } : { kind: "item", item }));
}

function isTabItem(item: StripItem): item is StripTab {
	return item.kind === "tab";
}
