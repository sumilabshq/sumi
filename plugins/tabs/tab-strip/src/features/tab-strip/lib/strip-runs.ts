import type { SidebarEntry, SidebarGroupState, TabsSidebar } from "@widgetarium/app-host/contract";
import { itemsOfEntry, stripGroupOf } from "./strip-items.js";
import type { StripGroup, StripItem, StripSplit } from "./strip-items.js";

export type StripRun =
	| {
			readonly kind: "item";
			readonly item: StripItem;
	  }
	| {
			readonly kind: "group";
			readonly group: StripGroup;
			readonly runs: readonly StripRun[];
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

export function tabCountOf(run: StripRun): number {
	return run.kind === "group" ? run.runs.reduce((count, inner) => count + tabCountOf(inner), 0) : 1;
}

function runsOfEntry(entry: SidebarEntry, list: string): readonly StripRun[] {
	if (entry.kind === "group") {
		return [groupRunOf(entry.group, list)];
	}

	return itemsOfEntry(entry, list).map((item) => (item.kind === "split" ? { kind: "split", split: item } : { kind: "item", item }));
}

function groupRunOf(group: SidebarGroupState, list: string): StripRun {
	return {
		kind: "group",
		group: stripGroupOf(group),
		runs: group.items.flatMap((item): readonly StripRun[] =>
			item.kind === "group"
				? [groupRunOf(item.group, list)]
				: [
						{
							kind: "item",
							item: {
								kind: "tab",
								tab: item.tab,
								list,
								groupId: group.id,
								group: stripGroupOf(group),
							},
						},
					],
		),
	};
}
