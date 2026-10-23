import type { HostTab, TabPage } from "../../../shared/lib/host-tabs/host-tabs.js";
import type { PageFacts } from "../../../shared/schema/page-facts.schema.js";

export function pagesOfTabs(tabs: readonly HostTab[], pages: readonly PageFacts[]): ReadonlyMap<string, PageFacts> {
	const bound = new Set(tabs.map((tab) => tab.pageId).filter((pageId) => pageId !== null));
	const free = pages.filter((page) => !bound.has(page.pageId));
	const held = new Map<string, PageFacts>();

	for (const tab of tabs.filter((one) => one.app === "browser")) {
		const page = tab.pageId === null ? free.shift() : pages.find((one) => one.pageId === tab.pageId);

		if (page) {
			held.set(tab.id, page);
		}
	}

	return held;
}

export function tabPagesOf(tabs: readonly HostTab[], pages: readonly PageFacts[]): ReadonlyMap<string, TabPage> {
	const facts = pagesOfTabs(tabs, pages);
	const held = new Map<string, TabPage>();

	for (const tab of tabs) {
		const pageId = tab.pageId ?? facts.get(tab.id)?.pageId ?? null;

		if (pageId !== null) {
			held.set(tab.id, {
				pageId,
				address: facts.get(tab.id)?.url ?? "",
			});
		}
	}

	return held;
}
