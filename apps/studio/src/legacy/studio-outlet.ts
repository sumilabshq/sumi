import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { StudioView } from "@widgetarium/core/engine/studio-state-port.js";
import { routeElementOf } from "@widgetarium/core/app/widgetarium-app.js";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import { StudioCanvas } from "../canvas/studio-canvas.js";
import type { StudioDesign } from "../canvas/studio-canvas.js";
import type { CanvasShell } from "../canvas/design-stage.js";
import { BrowserPage } from "../browser/browser-page.js";
import type { BrowserParts } from "@widgetarium/browser/gateways";

export interface StudioOutletProps {
	readonly project: StartedProject;
	readonly pathname: string;
	readonly view: StudioView;
	readonly design: StudioDesign;
	readonly shell: CanvasShell;
	readonly browser: BrowserParts;
}

export function StudioOutlet({ project, pathname, view, design, shell, browser }: StudioOutletProps): ReactElement {
	if (view === "browser")
		return h("main", { className: "wg-studio-outlet" }, h(BrowserPage, { parts: browser, shell }));
	const shown = view === "canvas" ? h(StudioCanvas, { design, project, shell }) : routeElementOf(project, pathname);
	return h("main", { className: "wg-studio-outlet" }, shown);
}
