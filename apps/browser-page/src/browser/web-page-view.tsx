import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { HeaderActions } from "@sumi/contract";
import type { SumiTab } from "../sumi-tab.js";
import type { SumiWebPage } from "../sumi-web-page.js";
import { NotAvailableNote } from "./not-available-note.js";
import { siteOf } from "./site-of.js";
import { useRecordsTitle } from "./use-records-title.js";
import { useShowsReload } from "./use-shows-reload.js";
import { useWebPage } from "./use-web-page.js";

export interface WebPageViewProps {
	readonly tab: SumiTab;
	readonly page: SumiWebPage;
	readonly headerActions: HeaderActions;
	readonly address: string;
	readonly onUrl: (url: string) => void;
}

export function WebPageView({ tab, page, headerActions, address, onUrl }: WebPageViewProps): ReactElement {
	const controls = useWebPage(page, address, onUrl);
	const { shown, failure } = controls;
	useShowsReload(headerActions, controls);
	useRecordsTitle(tab, shown.title || siteOf(shown.url));
	return (
		<div className="wg-browser-page-area" data-loading={shown.isLoading ? "" : undefined}>
			{failure === null ? (
				<div ref={controls.area} className="wg-browser-pages" data-browser-pages="" />
			) : (
				<NotAvailableNote reason={failure} />
			)}
		</div>
	);
}
