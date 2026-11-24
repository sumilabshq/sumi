import type { FlowStatus } from "../../schema/flows.schema.js";
import type { TabMark } from "../../schema/tabs.schema.js";

export interface StatusTab {
	readonly isChat: boolean;
	readonly mark: TabMark;
}

const MOST_URGENT_FIRST: readonly FlowStatus[] = ["failed", "asking", "running", "unread"];

export function flowStatusOf(tabs: readonly StatusTab[]): FlowStatus | null {
	const chatMarks = new Set(tabs.filter((tab) => tab.isChat).map((tab) => tab.mark));
	return MOST_URGENT_FIRST.find((status) => chatMarks.has(status)) ?? null;
}
