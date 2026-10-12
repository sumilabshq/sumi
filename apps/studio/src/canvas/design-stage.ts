import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { CanvasOpening, DesignSource, FrameSize, GpuSupply, ViewReturn } from "@widgetarium/canvas";
import { CanvasPage } from "./canvas-page.js";
import type { CanvasCorners } from "./canvas-page.js";
import type { CanvasHandle } from "./use-canvas-state.js";

export type { CanvasHandle } from "./use-canvas-state.js";

export interface CanvasShell {
	readonly corners: CanvasCorners;
}

export interface DesignStageProps {
	readonly source: DesignSource;
	readonly returnTo?: ViewReturn | undefined;
	readonly app: string;
	readonly opening: CanvasOpening;
	readonly onKept?: ((kept: CanvasOpening) => void) | undefined;
	readonly onCanvas?: ((canvas: CanvasHandle) => void) | undefined;
	readonly size: FrameSize;
	readonly ownsPaste?: (() => boolean) | undefined;
	readonly gpu?: GpuSupply | undefined;
	readonly shell?: CanvasShell | undefined;
}

export const CANVAS_OPENED_ON: CanvasOpening = { page: "", isLayersOpen: false, mode: "hand" };

const NO_CORNERS: CanvasCorners = { start: [], end: [] };
const STAGE = "wg-root cv:overflow-hidden cv:p-0 cv:[--wg-board-pad:0px] cv:[--wg-root-head:0px]";

export function DesignStage({ size, gpu, ownsPaste, shell, returnTo, ...page }: DesignStageProps): ReactElement {
	return h(
		"div",
		{ className: STAGE, style: { width: size.width, height: size.height }, "data-canvas-stage": "" },
		h(CanvasPage, {
			...page,
			size,
			returnTo,
			gpu: gpu ?? null,
			ownsPaste: ownsPaste ?? null,
			corners: shell?.corners ?? NO_CORNERS,
		}),
	);
}
