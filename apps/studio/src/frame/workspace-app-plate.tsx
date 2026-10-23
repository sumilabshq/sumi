import { createElement as h, useMemo } from "react";
import type { ReactElement } from "react";
import type { AppKind } from "@widgetarium/app-host";
import type { AppHostParts } from "@widgetarium/app-host/gateways";
import type { BrowserParts } from "@widgetarium/browser/gateways";
import { routeElementOf } from "@widgetarium/core/app/widgetarium-app.js";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { StudioView } from "@widgetarium/core/engine/studio-state-port.js";
import { useQuery } from "@widgetarium/core/requests";
import { HeaderButton, Plate, PlateCrumb, PlateMore, PlateShown } from "@widgetarium/shell";
import type { CrumbWords, PlateMoreItem } from "@widgetarium/shell";
import { WorkspacesQuery } from "@widgetarium/workspaces";
import { BrowserPage } from "../browser/browser-page.js";
import { StudioCanvas } from "../canvas/studio-canvas.js";
import type { StudioDesign } from "../canvas/studio-canvas.js";
import { KeptApps } from "../tabs/kept-apps.js";
import { APP_CRUMB_WORD } from "./app-crumb-words.js";
import { MovesUnheld } from "./moves-unheld.js";

export interface WorkspaceAppPlateProps {
	readonly project: StartedProject;
	readonly pathname: string;
	readonly view: StudioView;
	readonly design: StudioDesign;
	readonly browser: BrowserParts;
	readonly hostTabs: AppHostParts["hostTabs"];
	readonly backToView: () => void;
}

interface KeptAppPages {
	readonly browser: BrowserParts;
	readonly design: StudioDesign;
	readonly project: StartedProject;
}

const IN_PLATE = { isInPlate: true } as const;
const ROOT_PATH = "/";
const BACK_TO = "Back to {app}";
const HIDE_TABS = "Hide tabs";

export function WorkspaceAppPlate({
	project,
	pathname,
	view,
	design,
	browser,
	hostTabs,
	backToView,
}: WorkspaceAppPlateProps): ReactElement {
	const appName = useQuery(WorkspacesQuery).data.current.name;
	const shownApp = view === "app" ? null : view;
	const moreItems = useMemo(() => moreItemsOf(view, appName, backToView), [view, appName, backToView]);
	const drawnOf = (app: AppKind, isShown: boolean): ReactElement => (
		<PlateShown isShown={isShown}>{keptAppPageOf(app, { browser, design, project })}</PlateShown>
	);
	return (
		<Plate
			side="app"
			label={appName}
			edgeStart={null}
			lead={<MovesUnheld />}
			crumb={<PlateCrumb words={crumbOf(view, appName, pathname)} isPressable />}
			more={<PlateMore items={moreItems} />}
			edgeEnd={<HeaderButton label={HIDE_TABS} icon="panel-right" isInert />}
		>
			{view === "app" ? <div className="wg-shell-route">{routeElementOf(project, pathname)}</div> : null}
			<KeptApps shown={shownApp} hostTabs={hostTabs} drawnOf={drawnOf} />
		</Plate>
	);
}

function keptAppPageOf(app: AppKind, pages: KeptAppPages): ReactElement {
	if (app === "browser") {
		return <BrowserPage parts={pages.browser} />;
	}

	return <StudioCanvas design={pages.design} project={pages.project} shell={IN_PLATE} />;
}

function crumbOf(view: StudioView, appName: string, pathname: string): CrumbWords {
	if (view === "canvas") {
		return { first: APP_CRUMB_WORD.canvas, second: appName };
	}

	if (view === "browser") {
		return { first: APP_CRUMB_WORD.browser, second: null };
	}

	return { first: appName, second: pathname === ROOT_PATH ? null : pathname };
}

function moreItemsOf(view: StudioView, appName: string, backToView: () => void): readonly PlateMoreItem[] {
	if (view === "app") {
		return [];
	}

	return [{ said: BACK_TO.replace("{app}", appName), run: backToView }];
}
