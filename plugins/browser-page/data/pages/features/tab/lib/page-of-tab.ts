import { refuse } from "@widgetarium/data-framework";
import type { Send } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";

export function noPageReason(tabId: string): string {
	return `The tab ${tabId} has no page loaded.`;
}

export async function pageIdOf(send: Send, tabId: string): Promise<string> {
	const held = await send(appHost.tabs.heldTabs);
	const tab = held.tabs.find(({ id }) => id === tabId);

	if (tab === undefined) {
		return refuse(`No tab ${tabId} is open.`);
	}

	if (tab.pageId === null) {
		return refuse(noPageReason(tabId));
	}

	return tab.pageId;
}
