import type { HostTab } from "../host-tabs/host-tabs.js";
import { pagesOfTabs } from "../tab-showing/tab-pages.js";
import type { PageFacts } from "../../schema/page-facts.schema.js";
import type { EssentialFace } from "./essentials.js";

const TITLE_OF_APP = {
	canvas: "Canvas",
	browser: "New tab",
};

export function essentialFaceOf(tab: HostTab, tabs: readonly HostTab[], pages: readonly PageFacts[]): EssentialFace {
	const page = pagesOfTabs(tabs, pages).get(tab.id) ?? null;
	return {
		app: tab.app,
		address: page?.url || null,
		title: essentialTitleOf(tab, page),
		favicon: page?.favicon ?? null,
	};
}

function essentialTitleOf(tab: HostTab, page: PageFacts | null): string {
	return tab.label ?? (page?.title || TITLE_OF_APP[tab.app]);
}
