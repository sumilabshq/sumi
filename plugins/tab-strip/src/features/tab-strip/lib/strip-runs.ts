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

export function stripRunsOf(items: readonly StripItem[]): readonly StripRun[] {
	return items.reduce<readonly StripRun[]>((runs, item) => {
		if (item.kind === "split") {
			return [...runs, { kind: "split", split: item }];
		}

		if (item.group === null) {
			return [...runs, { kind: "item", item }];
		}

		const last = runs.at(-1);

		if (last?.kind === "group" && last.group.id === item.group.id) {
			return [...runs.slice(0, -1), { ...last, tabs: [...last.tabs, item] }];
		}

		return [...runs, { kind: "group", group: item.group, tabs: [item] }];
	}, []);
}

export function runIdOf(run: StripRun): string {
	if (run.kind === "item") {
		return run.item.kind === "tab" ? run.item.tab.id : run.item.split.id;
	}

	return run.kind === "group" ? run.group.id : run.split.split.id;
}
