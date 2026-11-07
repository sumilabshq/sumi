import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AppViewProps } from "@sumi/apps-plugin";
import { NEW_TAB_ADDRESS } from "./new-tab-address.js";
import { NewTabView } from "./new-tab-view.js";
import { NotAvailableNote } from "./not-available-note.js";
import { useTabAddress } from "./use-tab-address.js";
import { WebPageView } from "./web-page-view.js";

export function BrowserBody({ tabId }: AppViewProps): ReactElement | null {
	const { address, failure, navigate } = useTabAddress(tabId);

	if (failure !== null) {
		return <NotAvailableNote reason={failure} />;
	}

	if (address === null) {
		return null;
	}

	if (address === NEW_TAB_ADDRESS) {
		return <NewTabView tabId={tabId} navigate={navigate} />;
	}

	return <WebPageView tabId={tabId} address={address} onNavigated={navigate} />;
}
