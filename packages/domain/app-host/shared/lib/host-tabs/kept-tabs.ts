import { KeptTabsSchema } from "../../schema/tabs-session.schema.js";
import type { KeptTabs } from "../../schema/tabs-session.schema.js";
import { emptyMoment, momentOfKept, momentSaid } from "./host-tabs.js";
import type { HostTabsMoment } from "./host-tabs.js";

export function momentOf(kept: KeptTabs | null, chatId: string): HostTabsMoment {
	return kept === null ? emptyMoment() : momentOfKept(kept, chatId);
}

export function keptTabsOf(moment: HostTabsMoment): KeptTabs {
	return KeptTabsSchema.parse(moment);
}

export function tabsTransitionSaid(was: HostTabsMoment, next: HostTabsMoment, reason: string): string {
	return `host tabs ${momentSaid(was)} → ${momentSaid(next)} (${reason})`;
}
