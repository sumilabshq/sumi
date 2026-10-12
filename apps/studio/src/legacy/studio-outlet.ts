import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { StudioState, StudioView } from "@widgetarium/core/engine/studio-state-port.js";
import { routeElementOf } from "@widgetarium/core/app/widgetarium-app.js";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import { StudioCanvas } from "../canvas/studio-canvas.js";
import type { StudioDesign } from "../canvas/studio-canvas.js";
import type { CanvasShell } from "../canvas/design-stage.js";

export interface StudioOutletProps {
	readonly project: StartedProject;
	readonly pathname: string;
	readonly view: StudioView;
	readonly design: StudioDesign;
	readonly state: StudioState;
	readonly shell: CanvasShell;
}

export function StudioOutlet({ project, pathname, view, design, state, shell }: StudioOutletProps): ReactElement {
	const shown =
		view === "canvas" ? h(StudioCanvas, { design, project, state, shell }) : routeElementOf(project, pathname);
	return h("main", { className: "wg-studio-outlet" }, shown);
}
