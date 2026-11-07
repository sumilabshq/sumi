import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { AppViewProps } from "@sumi/apps-plugin";
import { NEW_TAB_ADDRESS } from "../../lib/new-tab-address.js";
import { NewTabView } from "../../../new-tab/ui/new-tab-view/new-tab-view.js";
import { NotAvailableNote } from "../../../../shared/ui/not-available-note/not-available-note.js";
import { useTabAddress } from "../../lib/use-tab-address.js";
import { WebPageView } from "../../../web-page/ui/web-page-view/web-page-view.js";

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
