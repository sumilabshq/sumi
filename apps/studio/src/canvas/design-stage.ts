import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { CanvasOpened, CanvasOpening, FrameSize } from "@widgetarium/canvas";
import type { CanvasParts } from "@widgetarium/canvas/adapters";
import { CanvasPage } from "./canvas-page.js";
import type { CanvasCorners } from "./canvas-page.js";
import type { CanvasHandle } from "./use-hands-canvas.js";

export type { CanvasHandle } from "./use-hands-canvas.js";

export interface CanvasShell {
	readonly corners: CanvasCorners;
}

export interface StageMount {
	readonly opened: CanvasOpened;
	readonly keepOpening: (kept: CanvasOpening) => void;
}

export interface DesignStageProps {
	readonly app: string;
	readonly opening: CanvasOpening;
	readonly partsOf: (mount: StageMount) => CanvasParts;
	readonly onKept?: ((kept: CanvasOpening) => void) | undefined;
	readonly onCanvas?: ((canvas: CanvasHandle) => void) | undefined;
	readonly size: FrameSize;
	readonly shell?: CanvasShell | undefined;
}

export const CANVAS_OPENED_ON: CanvasOpening = { page: "", isLayersOpen: false, mode: "hand" };

const NO_CORNERS: CanvasCorners = { start: null, end: null };
const STAGE = "wg-root cv:overflow-hidden cv:p-0 cv:[--wg-board-pad:0px] cv:[--wg-root-head:0px]";

export function DesignStage({ size, shell, onCanvas, app, opening, onKept, partsOf }: DesignStageProps): ReactElement {
	const [parts] = useState(() => partsOf({ opened: { ...opening, app }, keepOpening: onKept ?? keepsNothing }));
	return h(
		"div",
		{ className: STAGE, style: { width: size.width, height: size.height }, "data-canvas-stage": "" },
		h(CanvasPage, { parts, corners: shell?.corners ?? NO_CORNERS, onCanvas }),
	);
}

function keepsNothing(): void {}
