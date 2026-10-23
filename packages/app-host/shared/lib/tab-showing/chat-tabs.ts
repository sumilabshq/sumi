import { flatTabIdsOf } from "../host-tabs/host-tabs.js";
import type { HostTabs } from "../host-tabs/host-tabs.js";
import { showTab } from "./show-tab.js";
import type { TabShowing } from "./show-tab.js";

export function chatTabToShow(hostTabs: HostTabs, chatId: string): string | null {
	const moment = hostTabs.now();
	const ids = flatTabIdsOf(moment, chatId);
	const last = moment.lastShown[chatId];
	return last !== undefined && ids.includes(last) ? last : (ids[0] ?? null);
}

export function showChatTab(hostTabs: HostTabs, chatId: string, showing: TabShowing): void {
	const { tabs, shownId } = hostTabs.now();
	const isEssentialShown = tabs.some((tab) => tab.id === shownId && tab.essentialId !== null);
	const shownNext = chatTabToShow(hostTabs, chatId);

	if (isEssentialShown) {
		console.info(`[widgetarium] host tabs keep essential ${shownId} on screen in chat ${chatId}`);
		return;
	}

	if (shownNext === null || shownNext === shownId) {
		console.info(`[widgetarium] host tabs keep ${shownId ?? "nothing"} in chat ${chatId}`);
		return;
	}

	hostTabs.show(shownNext);
	showTab(hostTabs.tabOf(shownNext), hostTabs, showing);
}
