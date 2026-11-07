import { createElement as h } from "react";
import type { ReactElement } from "react";
import { NotAvailableNote } from "./not-available-note.js";
import { siteOf } from "./site-of.js";
import { useOffersReload } from "./use-offers-reload.js";
import { useRecordsTitle } from "./use-records-title.js";
import { useWebPage } from "./use-web-page.js";

export interface WebPageViewProps {
	readonly tabId: string;
	readonly address: string;
	readonly onNavigated: (url: string) => void;
}

export function WebPageView({ tabId, address, onNavigated }: WebPageViewProps): ReactElement {
	const { page, failure, areaRef, reload } = useWebPage(tabId, address, onNavigated);
	useOffersReload(tabId, page.isLoading, reload);
	useRecordsTitle(tabId, page.title || siteOf(page.url));
	return (
		<div className="wg-browser-page-area" data-loading={page.isLoading ? "" : undefined}>
			{failure === null ? (
				<div ref={areaRef} className="wg-browser-pages" data-browser-pages="" />
			) : (
				<NotAvailableNote reason={failure} />
			)}
		</div>
	);
}
