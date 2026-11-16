import { movedPlan, refusal } from "@widgetarium/navigation/lib/shared/lib/settling/settling";
import type { MomentPlan } from "@widgetarium/navigation/lib/shared/lib/settling/settling";
import { chatIdOf, heldTabOf } from "@widgetarium/navigation/lib/shared/lib/tabs/host-tabs";
import type { HostTab, HostTabsMoment, MovedTabs } from "@widgetarium/navigation/lib/shared/lib/tabs/host-tabs";
import { windowListOf } from "@widgetarium/navigation/lib/shared/lib/tabs/tab-lists";
import { markAfter, markSeen, recordTurn, withRunningMarksCleared } from "@widgetarium/navigation/lib/shared/lib/tabs/tab-marks";
import type { TabMark } from "@widgetarium/navigation/lib/shared/schema/tabs.schema";
import type { ChatTurn, NamedRecord } from "../../../shared/schema/chat-facts.schema.js";
import { keepChatTabs, linkedTabsOf } from "../../../shared/lib/chat-tabs.js";

const NOT_HELD = 'the host holds no tab "{id}" to mark seen';

export interface TurnMarks {
	readonly was: TabMark | null;
	readonly mark: TabMark | null;
}

const NOT_KEPT: TurnMarks = {
	was: null,
	mark: null,
};

export function keepChatTabsPlan(chats: readonly NamedRecord[], window: string): MomentPlan<null> {
	return (moment) => movedPlan(moment, keepChatTabs(moment, chats, windowListOf(window)), null);
}

export function recordTurnPlan(turn: ChatTurn): MomentPlan<TurnMarks> {
	return (moment) => {
		const linked = linkedTabsOf(moment, turn.id);
		const first = linked[0];

		if (first === undefined) {
			return movedPlan(moment, null, NOT_KEPT);
		}

		return movedPlan(moment, eachMoved(moment, linked, (now, tab) => recordTurn(now, tab, turn)), {
			was: first.mark,
			mark: markAfter(first.mark, turn),
		});
	};
}

export function forgetRunningTurnsPlan(): MomentPlan<null> {
	return (moment) => movedPlan(moment, withRunningMarksCleared(moment), null);
}

export function markSeenPlan(id: string): MomentPlan<null> {
	return (moment) => {
		const held = heldTabOf(moment, id);
		const linked = held === undefined ? [] : linkedTabsOf(moment, chatIdOf(moment.apps, held) ?? held.id);
		const marked = linked.length === 0 && held !== undefined ? [held] : linked;

		if (marked.length === 0) {
			return refusal(NOT_HELD.replace("{id}", id));
		}

		return movedPlan(moment, eachMoved(moment, marked, markSeen), null);
	};
}

function eachMoved(
	moment: HostTabsMoment,
	tabs: readonly HostTab[],
	move: (now: HostTabsMoment, tab: HostTab) => MovedTabs | null,
): MovedTabs | null {
	return tabs.reduce<MovedTabs | null>((was, tab) => {
		const now = was?.moment ?? moment;
		const moved = move(now, now.tabs.find((one) => one.id === tab.id) ?? tab);
		return moved === null ? was : { moment: moved.moment, reason: was === null ? moved.reason : `${was.reason}; ${moved.reason}` };
	}, null);
}
