import { createElement as h, Fragment, useEffect } from "react";
import type { ReactElement } from "react";
import type { SumiTab } from "../sumi-tab.js";
import type { SumiWebPage } from "../sumi-web-page.js";
import { BrowserControls } from "./browser-controls.js";
import { NotAvailableNote } from "./not-available-note.js";
import { siteOf } from "./site-of.js";
import { recordIn } from "./use-tab-address.js";
import { useWebPage } from "./use-web-page.js";

export interface WebPageViewProps {
	readonly tab: SumiTab;
	readonly page: SumiWebPage;
	readonly address: string;
	readonly onUrl: (url: string) => void;
}

export function WebPageView({ tab, page, address, onUrl }: WebPageViewProps): ReactElement {
	const controls = useWebPage(page, address, onUrl);
	const { shown, failure } = controls;
	const title = shown.title || siteOf(shown.url);
	useEffect(() => {
		recordIn(tab, {
			title,
		});
	}, [tab, title]);
	return (
		<Fragment>
			<BrowserControls controls={controls} />
			<div className="wg-browser-page-area" data-loading={shown.isLoading ? "" : undefined}>
				{failure === null ? (
					<div ref={controls.area} className="wg-browser-pages" data-browser-pages="" />
				) : (
					<NotAvailableNote reason={failure} />
				)}
			</div>
		</Fragment>
	);
}
