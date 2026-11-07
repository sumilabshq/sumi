import { PageTitlesQuery } from "@sumi/apps";
import type { Send } from "@widgetarium/data-framework";
import type { PageTab, PageTitles } from "./page-titles.js";

export async function pageTitlesOf(send: Send, tabs: readonly PageTab[]): Promise<PageTitles> {
	if (tabs.length === 0) {
		return new Map();
	}

	const { pages } = await send(PageTitlesQuery, { tabs: [...tabs] });
	return new Map(pages.map((page) => [page.id, page]));
}
