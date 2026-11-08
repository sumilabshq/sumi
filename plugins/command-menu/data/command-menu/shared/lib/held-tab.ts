import type { Send } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";

export async function heldTabOfPage(pageId: string | null, send: Send): Promise<string | null> {
	if (pageId === null) {
		return null;
	}

	const held = await send(appHost.tabs.heldTabs);
	return held.tabs.find((tab) => tab.pageId === pageId)?.id ?? null;
}
