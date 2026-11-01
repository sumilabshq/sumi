import { createElement as h, useEffect } from "react";
import type { ReactElement } from "react";
import { AppPlate } from "./features/plate/ui/app-plate.js";
import { NewTabPage } from "./browser/new-tab-page.js";
import { NotAvailableNote } from "./browser/not-available-note.js";
import { recordIn, useTabAddress } from "./browser/use-tab-address.js";
import { webAddressOf } from "./browser/web-address.js";
import { WebPageView } from "./browser/web-page-view.js";
import type { SumiTab } from "./sumi-tab.js";
import type { SumiWebPage } from "./sumi-web-page.js";

const APP_NAME = "Browser";
const FAVICON = "favicon.svg";
const NEW_TAB = "";
const NEW_TAB_TITLE = "New tab";
const SUMI_APP_PROTOCOL = "sumi-app:";

export interface BrowserRootProps {
	readonly tab: SumiTab;
	readonly page: SumiWebPage;
}

export function BrowserRoot({ tab, page }: BrowserRootProps): ReactElement {
	const { address, failure, navigate } = useTabAddress(tab);
	useEffect(() => {
		if (location.protocol !== SUMI_APP_PROTOCOL) {
			return;
		}

		recordIn(tab, {
			favicon: new URL(FAVICON, location.href).href,
		});
	}, [tab]);
	useEffect(() => {
		if (address !== NEW_TAB) {
			return;
		}

		recordIn(tab, {
			title: NEW_TAB_TITLE,
		});
	}, [tab, address]);
	return (
		<div className="wg-browser-app">
			<AppPlate name={APP_NAME}>
				<BrowserBody tab={tab} page={page} address={address} failure={failure} navigate={navigate} />
			</AppPlate>
		</div>
	);
}

interface BrowserBodyProps {
	readonly tab: SumiTab;
	readonly page: SumiWebPage;
	readonly address: string | null;
	readonly failure: string | null;
	readonly navigate: (address: string) => void;
}

function BrowserBody({ tab, page, address, failure, navigate }: BrowserBodyProps): ReactElement | null {
	if (failure !== null) {
		return <NotAvailableNote reason={failure} />;
	}

	if (address === null) {
		return null;
	}

	if (address === NEW_TAB) {
		return <NewTabPage onOpen={(typed) => navigate(webAddressOf(typed))} />;
	}

	return <WebPageView tab={tab} page={page} address={address} onUrl={navigate} />;
}
