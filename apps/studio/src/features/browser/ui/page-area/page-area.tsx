import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { BrowserTabsQuery } from "@widgetarium/browser";
import { useHeldTab } from "../../lib/held-tab.js";
import { useHoldsPages } from "../../lib/use-holds-pages.js";
import { PageState } from "../page-states/page-state.js";

export interface PageAreaProps {
	readonly searchFor: (text: string) => ReactNode;
	readonly children?: ReactNode;
}

const AREA =
	"cv:@container/page cv:relative cv:min-h-0 cv:flex-1 cv:overflow-hidden cv:rounded-b-[var(--sumi-r-group)]";
const READING = "cv:outline-2 cv:outline-offset-[-2px] cv:outline-brand";
const PAGES = "cv:absolute cv:inset-0";

export function PageArea({ searchFor, children }: PageAreaProps): ReactElement {
	const browserTabs = useQuery(BrowserTabsQuery, { heldTabId: useHeldTab() }).data;
	const pages = useHoldsPages(browserTabs.isAvailable);
	const shown = browserTabs.tabs.find((tab) => tab.isShown);
	const isReading = browserTabs.inkReading !== null && browserTabs.inkReading.tabId === shown?.id;

	return (
		<div className={isReading ? `${AREA} ${READING}` : AREA} data-browser-page-area="">
			<div ref={pages} className={PAGES} data-browser-pages="" />
			<PageState browserTabs={browserTabs} searchFor={searchFor} />
			{children}
		</div>
	);
}
