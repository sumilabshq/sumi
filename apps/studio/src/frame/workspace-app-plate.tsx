import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import type { StudioBrowser } from "../browser/browser-app.js";
import { routeElementOf } from "@widgetarium/core/app/widgetarium-app.js";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { StudioView } from "@widgetarium/core/engine/studio-state-port.js";
import { useQuery } from "@widgetarium/core/requests";
import { Plate } from "../features/plate/ui/plate/plate.js";
import { PlateCrumb } from "../features/plate/ui/plate-header/plate-crumb.js";
import { PlateMore } from "../features/plate/ui/plate-header/plate-more.js";
import { PlateShown } from "../features/plate/ui/plate-header/plate-shown.js";
import type { CrumbWords } from "../features/plate/ui/plate-header/plate-crumb.js";
import type { PlateMoreItem } from "../features/plate/ui/plate-header/plate-more.js";
import { WorkspacesQuery } from "@widgetarium/workspaces";
import { BrowserPage } from "../browser/browser-page.js";
import { StudioCanvas } from "../canvas/studio-canvas.js";
import { TerminalPage } from "../terminal/terminal-page.js";
import { TasksTabPage } from "../tasks/tasks-tab-page.js";
import type { StudioDesign } from "../canvas/studio-canvas.js";
import { KeptApps } from "../features/app-host/ui/kept-apps/kept-apps.js";
import type { KeptInstance } from "../features/app-host/ui/kept-apps/kept-apps.js";
import { useAppTitleOf } from "./use-app-title-of.js";
import type { AppTitleOf } from "./use-app-title-of.js";
import { MovesUnheld } from "./moves-unheld.js";

export interface WorkspaceAppPlateProps {
	readonly project: StartedProject;
	readonly pathname: string;
	readonly view: StudioView;
	readonly design: StudioDesign;
	readonly browser: StudioBrowser;
	readonly backToView: () => void;
}

interface KeptAppPages {
	readonly browser: StudioBrowser;
	readonly design: StudioDesign;
	readonly project: StartedProject;
}

const IN_PLATE = { isInPlate: true } as const;
const ROOT_PATH = "/";
const BACK_TO = "Back to {app}";

export function WorkspaceAppPlate({
	project,
	pathname,
	view,
	design,
	browser,
	backToView,
}: WorkspaceAppPlateProps): ReactElement {
	const appName = useQuery(WorkspacesQuery).data.current.name;
	const appTitleOf = useAppTitleOf();
	const shownApp = view === "app" ? null : view;
	const moreItems = useMemo(() => moreItemsOf(view, appName, backToView), [view, appName, backToView]);
	const drawnOf = (instance: KeptInstance, isShown: boolean): ReactElement => (
		<PlateShown isShown={isShown}>{keptAppPageOf(instance, { browser, design, project })}</PlateShown>
	);
	return (
		<Plate
			side="app"
			label={appName}
			edgeStart={null}
			lead={<MovesUnheld />}
			crumb={<PlateCrumb words={crumbOf({ view, appName, pathname, appTitleOf })} isPressable />}
			more={<PlateMore items={moreItems} />}
			edgeEnd={null}
		>
			{view === "app" ? <div className="wg-shell-route">{routeElementOf(project, pathname)}</div> : null}
			<KeptApps shown={shownApp} drawnOf={drawnOf} />
		</Plate>
	);
}

function keptAppPageOf({ app, tabId }: KeptInstance, pages: KeptAppPages): ReactElement {
	if (app === "browser") {
		return <BrowserPage browser={pages.browser} heldTabId={null} />;
	}

	if (app === "terminal") {
		return <TerminalPage />;
	}

	if (app === "tasks") {
		return <TasksTabPage tabId={tabId} />;
	}

	return <StudioCanvas design={pages.design} project={pages.project} shell={IN_PLATE} />;
}

interface CrumbAsk {
	readonly view: StudioView;
	readonly appName: string;
	readonly pathname: string;
	readonly appTitleOf: AppTitleOf;
}

function crumbOf({ view, appName, pathname, appTitleOf }: CrumbAsk): CrumbWords {
	if (view === "canvas") {
		return { first: appTitleOf("canvas"), second: appName };
	}

	if (view === "browser" || view === "terminal" || view === "tasks") {
		return { first: appTitleOf(view), second: null };
	}

	return { first: appName, second: pathname === ROOT_PATH ? null : pathname };
}

function moreItemsOf(view: StudioView, appName: string, backToView: () => void): readonly PlateMoreItem[] {
	if (view === "app") {
		return [];
	}

	return [{ said: BACK_TO.replace("{app}", appName), run: backToView }];
}
