import type { HostTabs } from "../host-tabs/host-tabs.js";
import type { PageFacts } from "../../schema/page-facts.schema.js";
import { newTabPageOf } from "./new-tab-page.js";
import { tabPageOf } from "./tab-pages.js";

export interface PageMaking {
	isAvailable(): boolean;
	pages(): readonly PageFacts[];
	openPage(pageId: string): void;
}

export function ensureTabPage(hostTabs: HostTabs, pageMaking: PageMaking, tabId: string, why: string): string | null {
	const tab = hostTabs.tabOf(tabId);
	const pageId = tabPageOf(hostTabs, pageMaking, tabId)?.pageId ?? newTabPageOf(tab.app, pageMaking.isAvailable());

	if (pageId === null) {
		return null;
	}

	hostTabs.givePage(tabId, pageId, why);
	openUnheldPage(pageMaking, pageId, tabId);
	return pageId;
}

function openUnheldPage(pageMaking: PageMaking, pageId: string, tabId: string): void {
	if (pageMaking.pages().some((page) => page.pageId === pageId)) {
		return;
	}

	console.info(`[widgetarium] browser page ${pageId} unlisted → open asked (${tabId} needs it)`);
	pageMaking.openPage(pageId);
}
