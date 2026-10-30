import type { PageTab } from "../tabs/host-tabs.js";
import { pagesOfTabs } from "../showing/tab-pages.js";
import type { HostTab } from "../tabs/host-tabs.js";
import type { PageFacts } from "../../schema/screen.schema.js";
import type { EssentialFace } from "../../schema/tab-rows.schema.js";

const TITLE_OF_APP = {
	canvas: "Canvas",
	browser: "New tab",
	terminal: "Terminal",
};

export function essentialFaceOf(tab: PageTab, tabs: readonly HostTab[], pages: readonly PageFacts[]): EssentialFace {
	const page = pagesOfTabs(tabs, pages).get(tab.id) ?? null;
	return {
		app: tab.app,
		address: page?.url || null,
		title: essentialTitleOf(tab, page),
		favicon: page?.favicon ?? null,
	};
}

function essentialTitleOf(tab: PageTab, page: PageFacts | null): string {
	return tab.label ?? (page?.title || TITLE_OF_APP[tab.app]);
}
