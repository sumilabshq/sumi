import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CanvasOpening } from "@widgetarium/canvas";
import type { StartedApp } from "@widgetarium/core/requests";
import type { CanvasSurroundings } from "../features/canvas/lib/canvas-surroundings.js";
import { CanvasPage } from "./canvas-page.js";
import type { CanvasShell } from "./canvas-page.js";
import type { CanvasHandle } from "./use-hands-canvas.js";

export type { CanvasHandle } from "./use-hands-canvas.js";

export type { CanvasShell } from "./canvas-page.js";

export type { CanvasHosts, ProjectCanvasHosts, VaultCanvasHosts } from "./canvas-hosts.js";

export type { CanvasSurroundings, ReturnTo } from "../features/canvas/lib/canvas-surroundings.js";

export { startCanvasApp } from "./canvas-app.js";

export interface StageSize {
	readonly width: number;
	readonly height: number;
}

export interface DesignStageProps {
	readonly app: string;
	readonly opening: CanvasOpening;
	readonly canvasApp: StartedApp;
	readonly surroundings: CanvasSurroundings;
	readonly onKept?: ((kept: CanvasOpening) => void) | undefined;
	readonly onCanvas?: ((canvas: CanvasHandle) => void) | undefined;
	readonly size: StageSize;
	readonly shell?: CanvasShell | undefined;
}

export const CANVAS_OPENED_ON: CanvasOpening = {
	page: "",
	isLayersOpen: true,
	mode: "hand",
};

const STAGE = "wg-root cv:overflow-hidden cv:p-0 cv:[--wg-board-pad:0px] cv:[--wg-root-head:0px]";

export function DesignStage({
	size,
	shell,
	onCanvas,
	app,
	opening,
	onKept,
	canvasApp,
	surroundings,
}: DesignStageProps): ReactElement {
	const opened = {
		...opening,
		app,
	};
	return h(
		"div",
		{ className: STAGE, style: { width: size.width, height: size.height }, "data-canvas-stage": "" },
		h(CanvasPage, { canvasApp, opened, surroundings, shell, onKept, onCanvas }),
	);
}
