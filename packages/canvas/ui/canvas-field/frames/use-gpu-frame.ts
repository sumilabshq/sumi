import { createElement as h, useContext, useEffect, useLayoutEffect, useMemo } from "react";
import type { ReactNode, RefObject } from "react";
import { GPU_FRAMES, useGpuFailure } from "@widgetarium/gpu";
import type { GpuFrames } from "@widgetarium/gpu";
import { DRAWS_INLINE } from "@widgetarium/core/draws-inline.js";
import type { StatePicture } from "../../../schema/design.js";
import type { Drawing } from "../../../schema/drawing.js";
import type { FrameSize } from "../../../schema/frame-size.js";
import { REPORTS_DRAW_FAILURE } from "../../state-drawing/draw-contexts.js";
import { StateDrawing } from "../../state-drawing/state-drawing.js";

export interface GpuFrameAsk {
	readonly id: string;
	readonly label: string;
	readonly size: FrameSize;
	readonly picture: StatePicture | null;
	readonly registry: Drawing["registry"];
	readonly node: RefObject<HTMLDivElement | null>;
}

export interface GpuFrameDrawn {
	readonly isGpu: boolean;
	readonly failure: string | undefined;
}

// TODO: draw a board on the GPU; WidgetSurface still needs a DOM node
const BOARDS_STAY_HTML = "a board is drawn as HTML; the GPU canvas draws widget states only";

export function useGpuFrame({ id, label, size, picture, registry, node }: GpuFrameAsk): GpuFrameDrawn {
	const frames = useContext(GPU_FRAMES);
	const failure = useGpuFailure(frames, id);
	const element = useMemo(
		() => (picture ? frameTreeOf(frames, id, picture, registry) : null),
		[frames, id, picture, registry],
	);
	const isGpu = frames !== null && element !== null && failure === undefined;
	useEffect(() => {
		if (frames && !picture) frames.fail(id, BOARDS_STAY_HTML);
	}, [frames, picture, id]);
	useLayoutEffect(() => {
		const held = node.current;
		if (!isGpu || !held) return undefined;
		return frames.claim({ id, title: label, width: size.width, minHeight: size.height, node: held }, element);
	}, [isGpu, frames, id, label, size.width, size.height, node]);
	useEffect(() => {
		if (isGpu) frames.redraw(id, element);
	}, [isGpu, frames, id, element]);
	return { isGpu, failure };
}

function frameTreeOf(
	frames: GpuFrames | null,
	id: string,
	picture: StatePicture,
	registry: Drawing["registry"],
): ReactNode {
	const report = (failure: unknown): void => frames?.fail(id, failure);
	return h(
		DRAWS_INLINE.Provider,
		{ value: true },
		h(REPORTS_DRAW_FAILURE.Provider, { value: report }, h(StateDrawing, { picture, registry })),
	);
}
