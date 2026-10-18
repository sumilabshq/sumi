import { createElement as h, Fragment } from "react";
import type { ReactElement } from "react";
import type { StudioView } from "@widgetarium/core/engine/studio-state-port.js";
import { routeElementOf } from "@widgetarium/core/app/widgetarium-app.js";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import { StudioCanvas } from "../canvas/studio-canvas.js";
import type { StudioDesign } from "../canvas/studio-canvas.js";
import type { CanvasShell } from "../canvas/design-stage.js";
import { BrowserPage } from "../browser/browser-page.js";
import type { BrowserParts } from "@widgetarium/browser/gateways";
import type { AppKind } from "@widgetarium/app-host";
import { KeptApps } from "../tabs/kept-apps.js";

export interface StudioOutletProps {
	readonly project: StartedProject;
	readonly pathname: string;
	readonly view: StudioView;
	readonly design: StudioDesign;
	readonly shell: CanvasShell;
	readonly browser: BrowserParts;
}

export function StudioOutlet({ project, pathname, view, design, shell, browser }: StudioOutletProps): ReactElement {
	const drawnOf = (app: AppKind): ReactElement =>
		app === "browser" ? h(BrowserPage, { parts: browser, shell }) : h(StudioCanvas, { design, project, shell });
	return h("main", { className: "wg-studio-outlet" }, [
		view === "app" ? h(Fragment, { key: "route" }, routeElementOf(project, pathname)) : null,
		h(KeptApps, { key: "kept", shown: view === "app" ? null : view, hostTabs: shell.hostParts.hostTabs, drawnOf }),
	]);
}
