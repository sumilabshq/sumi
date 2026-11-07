import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { TabHeaderContext } from "@sumi/sumi-host-plugin";
import type { TabHeader } from "@sumi/sumi-host-plugin";
import { AppHeader } from "../app-header/app-header.js";
import { PageHeaderAction } from "../app-header/page-header-action.js";
import { PageHeaderActions } from "../app-header/page-header-actions.js";
import { useAppPageView } from "../../lib/use-app-page-view.js";
import { FrameNote } from "../frame-note/frame-note.js";
import { MissingApp } from "../missing-app/missing-app.js";
import { AppFrame } from "../app-frame/app-frame.js";
import { TabPageView } from "../tab-page-view/tab-page-view.js";

export interface AppPageProps {
	readonly app: string;
	readonly tabId: string | null;
}

const NO_TAB = "This tab was closed";
const PAGE_HEADER: TabHeader = {
	Actions: PageHeaderActions,
	Action: PageHeaderAction,
};

export function AppPage({ app, tabId }: AppPageProps): ReactElement {
	const view = useAppPageView(app, tabId);

	switch (view.kind) {
		case "closed":
			return <FrameNote said={NO_TAB} />;
		case "missing":
			return <MissingApp app={app} />;
		case "page":
			return (
				<TabHeaderContext.Provider value={PAGE_HEADER}>
					{view.page.header === "shell" ? <AppHeader app={app} tabId={view.tabId} /> : null}
					<TabPageView page={view.page} app={app} tabId={view.tabId} />
				</TabHeaderContext.Provider>
			);
		case "frame":
			return (
				<Fragment>
					<AppHeader app={app} tabId={view.tabId} />
					<AppFrame registered={view.registered} tabId={view.tabId} />
				</Fragment>
			);
	}
}
