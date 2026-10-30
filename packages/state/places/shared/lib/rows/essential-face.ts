import { pagesOfTabs } from "../showing/tab-pages.js";
import { APP_LABELS } from "./app-labels.js";
import type { HostTab } from "../tabs/host-tabs.js";
import type { PageFacts } from "../../schema/screen.schema.js";
import type { EssentialFace } from "../../schema/tab-rows.schema.js";

const NEW_PAGE = "New tab";

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
	return tab.label ?? tab.title ?? (page?.title || appTitleOf(tab));
}

function appTitleOf({ app }: HostTab): string {
	return app === "browser" ? NEW_PAGE : APP_LABELS[app];
}
