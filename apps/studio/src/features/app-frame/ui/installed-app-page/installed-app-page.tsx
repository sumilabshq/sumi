import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useInstalledAppView } from "../../lib/use-installed-app-view.js";
import { FailedApp } from "../failed-app/failed-app.js";
import { FrameNote } from "../frame-note/frame-note.js";
import { MissingApp } from "../missing-app/missing-app.js";
import { WorkspaceAppFrame } from "../workspace-app-frame/workspace-app-frame.js";

export interface InstalledAppPageProps {
	readonly app: string;
	readonly tabId: string | null;
	readonly isShown: boolean;
}

const NO_TAB = "This tab was closed";

export function InstalledAppPage({ app, tabId, isShown }: InstalledAppPageProps): ReactElement {
	const view = useInstalledAppView(app, tabId);

	switch (view.kind) {
		case "closed":
			return <FrameNote said={NO_TAB} />;
		case "failed":
			return <FailedApp app={app} version={view.version} problem={view.problem} />;
		case "missing":
			return <MissingApp app={app} problem={view.problem} />;
		case "frame":
			return <WorkspaceAppFrame app={app} tab={view.tab} isShown={isShown} />;
	}
}
