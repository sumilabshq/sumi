import { Suspense, createElement as h } from "react";
import type { ReactElement } from "react";
import { AppProvider } from "@widgetarium/data-framework";
import type { DrawnTabPage } from "@sumi/sumi-host-plugin";
import { useTabPageApp } from "../../lib/use-tab-page-app.js";

export interface TabPageViewProps {
	readonly page: DrawnTabPage["page"];
	readonly app: string;
	readonly tabId: string;
}

export function TabPageView({ page: Page, app, tabId }: TabPageViewProps): ReactElement | null {
	const started = useTabPageApp({ app, tabId });

	if (started === null) {
		return null;
	}

	return (
		<AppProvider app={started}>
			<Suspense fallback={null}>
				<Page app={app} tabId={tabId} />
			</Suspense>
		</AppProvider>
	);
}
