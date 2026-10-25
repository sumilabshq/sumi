import { chatOfTab } from "../host-tabs/host-tabs.js";
import type { HostTabsMoment } from "../host-tabs/host-tabs.js";
import { WORKSPACE_LIST } from "../host-tabs/tab-lists.js";

export function chatHomeOf(moment: HostTabsMoment, tabId: string): string | null {
	const list = chatOfTab(moment, tabId);
	return list === null || list === WORKSPACE_LIST ? null : list;
}
