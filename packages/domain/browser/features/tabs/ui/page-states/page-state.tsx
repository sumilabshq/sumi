import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import type { BrowserTabs } from "../../../../shared/schema/browser-tab.schema.js";
import { FailurePage } from "./failure-page.js";
import { NewTabPage } from "./new-tab-page.js";
import { NotAvailableNote } from "./not-available-note.js";

export interface PageStateProps {
	readonly browserTabs: BrowserTabs;
	readonly searchFor: (text: string) => ReactNode;
}

export function PageState({ browserTabs, searchFor }: PageStateProps): ReactElement | null {
	const shown = browserTabs.tabs.find((tab) => tab.isShown);

	if (!browserTabs.isAvailable) {
		return <NotAvailableNote />;
	}

	if (shown === undefined) {
		return null;
	}

	if (shown.failure !== null) {
		return <FailurePage tab={shown} failure={shown.failure} searchFor={searchFor} />;
	}

	return shown.url === "" ? <NewTabPage tabId={shown.id} recentSites={browserTabs.recentSites} /> : null;
}
