import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { AppHeader } from "../app-header/app-header.js";
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

export function AppPage({ app, tabId }: AppPageProps): ReactElement {
	const view = useAppPageView(app, tabId);

	switch (view.kind) {
		case "closed":
			return <FrameNote said={NO_TAB} />;
		case "missing":
			return <MissingApp app={app} />;
		case "page":
			return (
				<Fragment>
					{view.page.header === "shell" ? <AppHeader app={app} tabId={view.tabId} /> : null}
					<TabPageView page={view.page} app={app} tabId={view.tabId} />
				</Fragment>
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
