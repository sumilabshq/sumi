import { apps } from "@sumi/apps/contract";
import type { Send } from "@widgetarium/data-framework";
import { places } from "@widgetarium/places/contract";
import type { TabsAsk } from "@widgetarium/places/contract";
import type { PageTab, PageTitles } from "./page-titles.js";

export async function pageTitlesOf(send: Send, tabs: readonly PageTab[]): Promise<PageTitles> {
	if (tabs.length === 0) {
		return new Map();
	}

	const { pages } = await send(apps.pages.pageTitles, { tabs: [...tabs] });
	return new Map(pages.map((page) => [page.id, page]));
}

export async function rememberPageTitles(send: Send, at: TabsAsk): Promise<void> {
	const { tabs } = await send(places.tabs.heldTabs, { at });
	const pageOf = new Map(at.screen.pages.map((page) => [page.pageId, page]));
	const pages = tabs.flatMap(({ id, pageId }) => {
		const page = pageId === null ? undefined : pageOf.get(pageId);
		return page === undefined ? [] : [{ tabId: id, url: page.url, title: page.title, favicon: page.favicon }];
	});

	if (pages.length === 0) {
		return;
	}

	await send(apps.pages.rememberPageTitles, { pages });
}
