import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import { AppHeader } from "../app-header/app-header.js";
import { useAppPageView } from "../../lib/use-app-page-view.js";
import { FrameNote } from "../frame-note/frame-note.js";
import { MissingApp } from "../missing-app/missing-app.js";
import { AppFrame } from "../app-frame/app-frame.js";
import { PluginAppView } from "../plugin-app-view/plugin-app-view.js";

export interface AppPageProps {
	readonly app: string;
	readonly tabId: string | null;
}

const NO_TAB = "This tab was closed";
const CHAT_APP = "chat";

export function AppPage({ app, tabId }: AppPageProps): ReactElement {
	const view = useAppPageView(app, tabId);

	switch (view.kind) {
		case "closed":
			return <FrameNote said={NO_TAB} />;
		case "missing":
			return <MissingApp app={app} />;
		case "view":
			return (
				<Fragment>
					<AppHeader app={app} tabId={view.tabId} />
					<PluginAppView app={view.app} tabId={view.tabId} />
				</Fragment>
			);
		case "frame":
			return (
				<Fragment>
					{app === CHAT_APP ? null : <AppHeader app={app} tabId={view.tabId} />}
					<AppFrame registered={view.registered} tabId={view.tabId} />
				</Fragment>
			);
	}
}
