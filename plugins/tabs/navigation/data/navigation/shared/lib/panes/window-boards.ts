import { labelOfPlacesWindow } from "@widgetarium/behaviors";
import type { PaneTree, WindowSeat } from "../../schema/pane-tree.schema.js";
import type { KeptSplit } from "../../schema/splits.schema.js";
import { WindowViewSchema } from "../../schema/tabs.schema.js";
import type { PlacedTabs } from "../../schema/tabs.schema.js";
import { isPageApp } from "../tabs/app-abilities.js";
import type { PlacedApps } from "../tabs/app-abilities.js";
import { EMPTY_PANES, firstPanesOf, keptPanesOf } from "./kept-panes.js";
import { treeShowingShownTabAlone } from "./pane-trees.js";
import { treeLeavingSplit, treeShowingSplit } from "./split-boards.js";
import type { SplitDrawing } from "./split-boards.js";
import { treeHeldBy } from "./window-trees.js";
import type { WindowTree } from "./window-trees.js";

export interface PanesAt {
	readonly placed: PlacedTabs;
	readonly seat: WindowSeat;
	readonly apps: PlacedApps;
}

export interface WindowBoard {
	readonly tree: PaneTree;
	readonly others: readonly WindowTree[];
}

export function windowBoardOf({ placed, seat, apps }: PanesAt): WindowBoard {
	const own = keptPanesOf(placed.views[seat.window]?.panes) ?? firstPanesOf(seat.boot);
	const others = joinedOthersOf(placed, seat.window, apps);
	return {
		tree: treeHeldBy(drawnTreeOf(placed, { window: seat.window, own, apps }), earlierOf(placed, seat.window, others)),
		others,
	};
}

export function placedWithPanes(placed: PlacedTabs, window: string, drawn: PaneTree): PlacedTabs {
	const kept = shownSplitOf(placed, window) === null ? drawn : treeLeavingSplit(drawn);
	return {
		...placed,
		views: {
			...placed.views,
			[window]: {
				...(placed.views[window] ?? WindowViewSchema.parse({ shownId: null })),
				panes: kept,
			},
		},
	};
}

interface OwnTree {
	readonly window: string;
	readonly own: PaneTree;
	readonly apps: PlacedApps;
}

function drawnTreeOf(placed: PlacedTabs, { window, own, apps }: OwnTree): PaneTree {
	const split = shownSplitOf(placed, window);

	if (split !== null) {
		return treeShowingSplit(own, drawingOf(placed, split, apps));
	}

	return own.root === null ? treeShowingShownTabAlone(own) : own;
}

function shownSplitOf(placed: PlacedTabs, window: string): KeptSplit | null {
	const shownSplitId = placed.views[window]?.shownSplitId ?? null;
	return placed.splits.find(({ id }) => id === shownSplitId) ?? null;
}

function drawingOf(placed: PlacedTabs, split: KeptSplit, apps: PlacedApps): SplitDrawing {
	const pageIds = new Set(placed.tabs.filter((tab) => isPageApp(apps, tab.app)).map(({ id }) => id));
	return {
		layout: split.layout,
		chatIds: split.memberIds.filter((id) => !pageIds.has(id)),
		focusedId: split.focusedId,
	};
}

function joinedOthersOf(placed: PlacedTabs, window: string, apps: PlacedApps): readonly WindowTree[] {
	const own = labelOfPlacesWindow(window);
	const joined = joinedLabelsOf(placed).filter((label) => label !== own);
	return joined.flatMap((label) =>
		Object.entries(placed.views)
			.filter(([other]) => labelOfPlacesWindow(other) === label)
			.map(([other, view]) => ({
				window: other,
				tree: drawnTreeOf(placed, { window: other, own: keptPanesOf(view.panes) ?? EMPTY_PANES, apps }),
			})),
	);
}

function earlierOf(placed: PlacedTabs, window: string, others: readonly WindowTree[]): readonly WindowTree[] {
	const joined = joinedLabelsOf(placed);
	const at = joined.indexOf(labelOfPlacesWindow(window));
	const earlier = at === -1 ? joined : joined.slice(0, at);
	return others.filter((other) => earlier.includes(labelOfPlacesWindow(other.window)));
}

function joinedLabelsOf(placed: PlacedTabs): readonly string[] {
	return [...placed.windows].sort((one, other) => one.openedAt - other.openedAt).map(({ label }) => label);
}
