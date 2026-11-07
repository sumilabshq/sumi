import { chatOfTab } from "../tabs/host-tabs.js";
import type { HostTabsMoment } from "../tabs/host-tabs.js";
import { isSectionList } from "../tabs/tab-lists.js";

export function chatHomeOf(moment: HostTabsMoment, tabId: string): string | null {
	const list = chatOfTab(moment, tabId);
	return list === null || isSectionList(list) ? null : list;
}
