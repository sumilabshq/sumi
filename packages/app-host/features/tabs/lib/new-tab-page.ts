import type { HostTab } from "../../../shared/lib/host-tabs/host-tabs.js";
import type { AppKind } from "../../../shared/schema/app-tab.schema.js";
import type { PageFacts } from "../../../shared/schema/page-facts.schema.js";
import { freePageOf } from "./tab-pages.js";

export type NewTabPage = { readonly pageId: string | null } | { readonly refusal: string };

// TODO: multi-page browser support replaces this refusal
const NO_FREE_PAGE = "Only one browser tab for now";

export function newTabPageOf(app: AppKind, tabs: readonly HostTab[], pages: readonly PageFacts[]): NewTabPage {
	if (app !== "browser" || pages.length === 0) {
		return { pageId: null };
	}

	const page = freePageOf(tabs, pages);
	return page === null ? { refusal: NO_FREE_PAGE } : { pageId: page.pageId };
}
