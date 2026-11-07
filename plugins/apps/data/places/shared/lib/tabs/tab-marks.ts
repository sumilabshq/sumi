import type { TabMark } from "../../schema/tabs.schema.js";
import type { TabTurn } from "../../schema/tab-facts.schema.js";
import { tabsWith } from "./host-tabs.js";
import type { HostTab, HostTabsMoment, MovedTabs } from "./host-tabs.js";

export function markAfter(mark: TabMark, { isBusy, isSeen }: Pick<TabTurn, "isBusy" | "isSeen">): TabMark {
	if (isBusy) {
		return "running";
	}

	if (mark === "running") {
		return isSeen ? "none" : "unread";
	}

	return mark;
}

export function recordTurn(moment: HostTabsMoment, tab: HostTab, turn: TabTurn): MovedTabs | null {
	const mark = markAfter(tab.mark, turn);
	const title = turn.title ?? tab.title;
	return changedFacts(moment, tab, { mark, title }, "turn");
}

export function markSeen(moment: HostTabsMoment, tab: HostTab): MovedTabs | null {
	return changedFacts(moment, tab, { mark: "none", title: tab.title }, "seen");
}

export function withRunningMarksCleared(moment: HostTabsMoment): MovedTabs | null {
	const running = moment.tabs.filter((tab) => tab.mark === "running");

	if (running.length === 0) {
		return null;
	}

	return {
		moment: {
			...moment,
			tabs: moment.tabs.map((tab) => (tab.mark === "running" ? { ...tab, mark: "none" } : tab)),
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
