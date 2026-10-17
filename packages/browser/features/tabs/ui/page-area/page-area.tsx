import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useQuery } from "@widgetarium/core/requests";
import { BrowserTabsQuery } from "../../contract.js";
import { useHoldsPages } from "../../lib/use-holds-pages.js";

export interface PageAreaProps {
	readonly children?: ReactNode;
}

const AREA = "cv:relative cv:min-h-0 cv:flex-1 cv:overflow-hidden cv:rounded-plate cv:bg-raise";
const READING = "cv:outline-2 cv:outline-offset-[-2px] cv:outline-brand";
const PAGES = "cv:absolute cv:inset-0";
const NOTE =
	"cv:absolute cv:inset-0 cv:grid cv:place-items-center cv:p-6 cv:text-center cv:text-sm cv:text-muted-foreground";
const NOT_AVAILABLE = "The browser opens pages only inside the Obsidian desktop app.";
const NEW_TAB = "Type an address above to open a page.";

export function PageArea({ children }: PageAreaProps): ReactElement {
	const { isAvailable, tabs, inkReading } = useQuery(BrowserTabsQuery).data;
	const pages = useHoldsPages(isAvailable);
	const shown = tabs.find((tab) => tab.isShown);
	const note = noteOf(isAvailable, shown?.url ?? "");
	const isReading = inkReading !== null && inkReading.tabId === shown?.id;

	return (
		<div className={isReading ? `${AREA} ${READING}` : AREA} data-browser-page-area="">
			<div ref={pages} className={PAGES} data-browser-pages="" />
			{note === null ? null : <p className={NOTE}>{note}</p>}
			{children}
		</div>
	);
}

function noteOf(isAvailable: boolean, url: string): string | null {
	if (!isAvailable) {
		return NOT_AVAILABLE;
	}

	return url === "" ? NEW_TAB : null;
}
