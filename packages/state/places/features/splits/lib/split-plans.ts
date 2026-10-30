import { plannedWith, refusal } from "../../../shared/lib/settling/settling.js";
import type { ExtraPlan } from "../../../shared/lib/settling/settling.js";
import { withMoved } from "../../../shared/lib/showing/showing.js";
import { heldTabOf } from "../../../shared/lib/tabs/host-tabs.js";
import type { HostTabsMoment } from "../../../shared/lib/tabs/host-tabs.js";
import { shownSplitOf, splitOfTab } from "../../../shared/lib/splits/split-members.js";
import { isSplitRefusal, placeInView, removeFromSplit, resizeSplit } from "../../../shared/lib/splits/split-moves.js";
import type { SplitResizing, ViewPlacing } from "../../../shared/lib/splits/split-moves.js";

export interface ViewPlacingAsk extends ViewPlacing {
	readonly isPaneMoved: boolean;
}

export function placeInViewPlan({ isPaneMoved, ...placing }: ViewPlacingAsk): ExtraPlan<boolean> {
	return (showing) => {
		const skipped = skippedPlacingOf(showing.moment, placing, isPaneMoved);

		if (skipped !== null) {
			console.info(`[widgetarium] place ${placing.tabId} in view skipped: ${skipped}`);
			return plannedWith(showing, false);
		}

		const move = placeInView(showing.moment, placing);
		return isSplitRefusal(move) ? refusal(move.refusal) : plannedWith(withMoved(showing, move), true);
	};
}

export function removeFromSplitPlan(tabId: string): ExtraPlan<boolean> {
	return (showing) => {
		if (splitOfTab(showing.moment, tabId) === null) {
			return plannedWith(showing, false);
		}

		const move = removeFromSplit(showing.moment, tabId);
		return isSplitRefusal(move) ? refusal(move.refusal) : plannedWith(withMoved(showing, move), true);
	};
}

export function resizeSplitPlan(resizing: SplitResizing): ExtraPlan<null> {
	return (showing) => {
		const move = resizeSplit(showing.moment, resizing);
		return isSplitRefusal(move) ? refusal(move.refusal) : plannedWith(withMoved(showing, move), null);
	};
}

function skippedPlacingOf(moment: HostTabsMoment, placing: ViewPlacing, isPaneMoved: boolean): string | null {
	const target = placing.targetTabId ?? moment.shownId;

	if (!isHeld(moment, placing.tabId) || !isHeld(moment, target)) {
		return "places holds no such tab";
	}

	return isPaneMoved && shownSplitOf(moment) === null ? "a pane moves on a board that shows no split" : null;
}

function isHeld(moment: HostTabsMoment, id: string | null): boolean {
	return id !== null && heldTabOf(moment, id) !== undefined;
}
