import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { canvasHost } from "@widgetarium/canvas";
import type { CanvasHostParts, CanvasOpening, FrameSize } from "@widgetarium/canvas";
import type { Module } from "@widgetarium/core/mediator";
import { CanvasPage } from "./canvas-page.js";
import type { CanvasCorners } from "./canvas-page.js";
import type { CanvasHandle } from "./use-hands-canvas.js";

export type { CanvasHandle } from "./use-hands-canvas.js";

export interface CanvasShell {
	readonly corners: CanvasCorners;
}

export interface DesignStageProps extends Omit<CanvasHostParts, "opened" | "keepOpening"> {
	readonly app: string;
	readonly opening: CanvasOpening;
	readonly onKept?: ((kept: CanvasOpening) => void) | undefined;
	readonly onCanvas?: ((canvas: CanvasHandle) => void) | undefined;
	readonly size: FrameSize;
	readonly shell?: CanvasShell | undefined;
	readonly modules?: readonly Module[] | undefined;
}

export const CANVAS_OPENED_ON: CanvasOpening = { page: "", isLayersOpen: false, mode: "hand" };

const NO_CORNERS: CanvasCorners = { start: null, end: null };
const STAGE = "wg-root cv:overflow-hidden cv:p-0 cv:[--wg-board-pad:0px] cv:[--wg-root-head:0px]";

export function DesignStage({
	size,
	shell,
	modules,
	onCanvas,
	app,
	opening,
	onKept,
	...parts
}: DesignStageProps): ReactElement {
	const [host] = useState(() => canvasHost({ ...parts, opened: { ...opening, app }, keepOpening: onKept }));
	return h(
		"div",
		{ className: STAGE, style: { width: size.width, height: size.height }, "data-canvas-stage": "" },
		h(CanvasPage, { host, corners: shell?.corners ?? NO_CORNERS, modules, onCanvas }),
	);
}
