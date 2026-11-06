import type { Send } from "@widgetarium/data-framework";
import { HeldTabsQuery } from "@widgetarium/app-host";

export async function heldTabOfPage(pageId: string | null, send: Send): Promise<string | null> {
	if (pageId === null) {
		return null;
	}

	const held = await send(HeldTabsQuery);
	return held.tabs.find((tab) => tab.pageId === pageId)?.id ?? null;
}
