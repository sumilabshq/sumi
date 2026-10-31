import { pagesOfTabs } from "../showing/tab-pages.js";
import { titleOf } from "./tab-face.js";
import type { HostTab } from "../tabs/host-tabs.js";
import type { PageFacts } from "../../schema/screen.schema.js";
import type { EssentialFace } from "../../schema/tab-rows.schema.js";

export function essentialFaceOf(tab: HostTab, tabs: readonly HostTab[], pages: readonly PageFacts[]): EssentialFace {
	const page = pagesOfTabs(tabs, pages).get(tab.id) ?? null;
	return {
		app: tab.app,
		address: page?.url || null,
		title: titleOf({
			app: tab.app,
			label: tab.label,
			title: tab.title ?? (page?.title || null),
			address: null,
		}),
		favicon: page?.favicon ?? null,
	};
}
