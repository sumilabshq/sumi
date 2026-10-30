import { keepChatTabs } from "../../../shared/lib/tabs/chat-tabs.js";
import { heldTabOf } from "../../../shared/lib/tabs/host-tabs.js";
import { markAfter, markSeen, recordTurn, withRunningMarksCleared } from "../../../shared/lib/tabs/tab-marks.js";
import { movedPlan, refusal } from "../../../shared/lib/settling/settling.js";
import type { MomentPlan } from "../../../shared/lib/settling/settling.js";
import type { NamedRecord, TabTurn } from "../../../shared/schema/tab-facts.schema.js";
import type { TabMark } from "../../../shared/schema/tabs.schema.js";

const NOT_HELD = 'the host holds no tab "{id}" to mark seen';

export interface TurnMarks {
	readonly was: TabMark | null;
	readonly mark: TabMark | null;
}

const NOT_KEPT: TurnMarks = {
	was: null,
	mark: null,
};

export function keepChatTabsPlan(chats: readonly NamedRecord[]): MomentPlan<null> {
	return (moment) => movedPlan(moment, keepChatTabs(moment, chats), null);
}

export function recordTurnPlan(turn: TabTurn): MomentPlan<TurnMarks> {
	return (moment) => {
		const tab = heldTabOf(moment, turn.id);

		if (tab === undefined) {
			return movedPlan(moment, null, NOT_KEPT);
		}

		return movedPlan(moment, recordTurn(moment, tab, turn), { was: tab.mark, mark: markAfter(tab.mark, turn) });
	};
}

export function forgetRunningTurnsPlan(): MomentPlan<null> {
	return (moment) => movedPlan(moment, withRunningMarksCleared(moment), null);
}

export function markSeenPlan(id: string): MomentPlan<null> {
	return (moment) => {
		const tab = heldTabOf(moment, id);

		if (tab === undefined) {
			return refusal(NOT_HELD.replace("{id}", id));
		}

		return movedPlan(moment, markSeen(moment, tab), null);
	};
}
