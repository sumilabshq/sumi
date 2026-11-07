import type { HostTab, HostTabsMoment, TabPage } from "../tabs/host-tabs.js";
import type { PageFacts } from "../../schema/screen.schema.js";

export function pagesOfTabs(tabs: readonly HostTab[], pages: readonly PageFacts[]): ReadonlyMap<string, PageFacts> {
	const pageOf = new Map(pages.map((page) => [page.pageId, page]));
	return new Map(
		tabs.flatMap((tab) => {
			const page = tab.pageId === null ? undefined : pageOf.get(tab.pageId);
			return page === undefined ? [] : [[tab.id, page] as const];
		}),
	);
}

export function tabPagesOf(tabs: readonly HostTab[], pages: readonly PageFacts[]): ReadonlyMap<string, TabPage> {
	const facts = pagesOfTabs(tabs, pages);
	const held = new Map<string, TabPage>();

	for (const tab of tabs) {
		if (tab.pageId !== null) {
			held.set(tab.id, {
				pageId: tab.pageId,
				address: facts.get(tab.id)?.url ?? "",
			});
		}
	}

	return held;
}

export function tabPageOf(moment: HostTabsMoment, pages: readonly PageFacts[], tabId: string): TabPage | undefined {
	return tabPagesOf(moment.tabs, pages).get(tabId);
}
