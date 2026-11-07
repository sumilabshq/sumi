import { Suspense, createElement as h } from "react";
import type { CSSProperties, ReactElement } from "react";
import { AppProvider } from "@widgetarium/data-framework";
import type { DrawnTabPage } from "@sumi/sumi-host-plugin";
import { useTabPageApp } from "../../lib/use-tab-page-app.js";

// TODO: move to shell.css and board.css once board.css is free to edit
const FILL_TAB_STYLE: CSSProperties = {
	display: "flex",
	flexDirection: "column",
	width: "100%",
	height: "100%",
	minHeight: 0,
};

export interface TabPageViewProps {
	readonly page: DrawnTabPage;
	readonly app: string;
	readonly tabId: string;
}

export function TabPageView({ page, app, tabId }: TabPageViewProps): ReactElement | null {
	const started = useTabPageApp(page, { app, tabId });
	const Page = page.page;

	if (started === null) {
		return null;
	}

	return (
		<div style={FILL_TAB_STYLE} data-app-view={app} data-page-anchor-tab={tabId}>
			<AppProvider app={started}>
				<Suspense fallback={null}>
					<Page app={app} tabId={tabId} />
				</Suspense>
			</AppProvider>
		</div>
	);
}
