import type { TabMark } from "../../schema/tabs.schema.js";
import { tabsWith } from "./host-tabs.js";
import type { HostTab, HostTabsMoment, MovedTabs } from "./host-tabs.js";

export interface TurnFacts {
	readonly title: string | null;
	readonly isBusy: boolean;
	readonly isAsking: boolean;
	readonly isFailed: boolean;
	readonly isSeen: boolean;
}

type TurnState = Pick<TurnFacts, "isBusy" | "isAsking" | "isFailed" | "isSeen">;

function isTurnLive(mark: TabMark): boolean {
	return mark === "running" || mark === "asking";
}

export function markAfter(mark: TabMark, { isBusy, isAsking, isFailed, isSeen }: TurnState): TabMark {
	if (isAsking) {
		return "asking";
	}

	if (isBusy) {
		return "running";
	}

	if (!isTurnLive(mark)) {
		return mark;
	}

	if (isSeen) {
		return "none";
	}

	return isFailed ? "failed" : "unread";
}

export function markWithoutTurn(mark: TabMark): TabMark {
	return mark === "running" ? "none" : mark;
}

export function recordTurn(moment: HostTabsMoment, tab: HostTab, turn: TurnFacts): MovedTabs | null {
	const mark = markAfter(tab.mark, turn);
	const title = turn.title ?? tab.title;
	return changedFacts(moment, tab, { mark, title }, "turn");
}

export function markSeen(moment: HostTabsMoment, tab: HostTab): MovedTabs | null {
	const mark = tab.mark === "asking" ? tab.mark : "none";
	return changedFacts(moment, tab, { mark, title: tab.title }, "seen");
}

export function withRunningMarksCleared(moment: HostTabsMoment): MovedTabs | null {
	const running = moment.tabs.filter((tab) => tab.mark === "running");

	if (running.length === 0) {
		return null;
	}

	return {
		moment: {
			...moment,
			tabs: moment.tabs.map((tab) => ({ ...tab, mark: markWithoutTurn(tab.mark) })),
		},
		reason: `${running.map((tab) => tab.id).join(", ")} mark running → none (no turn runs across a start)`,
	};
}

interface TabFactsChange {
	readonly mark: TabMark;
	readonly title: string | null;
}

function changedFacts(moment: HostTabsMoment, tab: HostTab, next: TabFactsChange, why: string): MovedTabs | null {
	if (tab.mark === next.mark && tab.title === next.title) {
		return null;
	}

	return {
		moment: {
			...moment,
			tabs: tabsWith(moment, tab.id, next),
		},
		reason: `${tab.id} mark ${tab.mark} → ${next.mark}, title ${tab.title ?? "none"} → ${next.title ?? "none"} (${why})`,
	};
}
