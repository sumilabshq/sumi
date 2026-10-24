import { createElement as h, useContext, useLayoutEffect, useEffect, useMemo } from "react";
import type { ReactNode, RefObject } from "react";
import { GPU_FRAMES, useGpuFailure } from "@widgetarium/gpu";
import type { GpuFrames } from "@widgetarium/gpu";
import { DRAWS_INLINE } from "@widgetarium/core/draws-inline.js";
import type { StatePicture } from "@widgetarium/canvas";
import type { Drawing } from "./drawing.js";
import { REPORTS_DRAW_FAILURE } from "./draw-contexts.js";
import { StateDrawing } from "../ui/state-drawing/state-drawing.js";

export interface GpuFrameAsk {
	readonly id: string;
	readonly label: string;
	readonly width: number;
	readonly minHeight: number;
	readonly picture: StatePicture | null;
	readonly unpictured?: string;
	readonly registry: Drawing["registry"];
	readonly node: RefObject<HTMLDivElement | null>;
}

export const NO_GPU = "this host gives the canvas no GPU renderer";
const NO_PICTURE = "this frame has no picture to draw";
const NOT_DRAWN = "[widgetarium] a GPU frame is not drawn; its marker says why";

export function useGpuFrame({
	id,
	label,
	width,
	minHeight,
	picture,
	unpictured,
	registry,
	node,
}: GpuFrameAsk): string | null {
	const frames = useContext(GPU_FRAMES);
	const failure = useGpuFailure(frames, id);
	const element = useMemo(
		() => (picture ? frameTreeOf(frames, id, picture, registry) : null),
		[frames, id, picture, registry],
	);
	const refusal = refusalOf(frames, element !== null, unpictured);
	const notDrawn = refusal ?? failure ?? null;
	useWarnsNotDrawn(id, refusal);
	useLayoutEffect(() => {
		const held = node.current;
		if (notDrawn !== null || !frames || !held) return undefined;
		return frames.claim({ id, title: label, width, minHeight, node: held }, element);
	}, [notDrawn, frames, id, label, width, minHeight, node]);
	useEffect(() => {
		if (notDrawn === null) frames?.redraw(id, element);
	}, [notDrawn, frames, id, element]);
	return notDrawn;
}

function useWarnsNotDrawn(id: string, refusal: string | null): void {
	useEffect(() => {
		if (refusal !== null) {
			console.warn(NOT_DRAWN, id, refusal);
		}
	}, [id, refusal]);
}

function refusalOf(frames: GpuFrames | null, isPictured: boolean, unpictured: string | undefined): string | null {
	if (!frames) {
		return NO_GPU;
	}

	return isPictured ? null : (unpictured ?? NO_PICTURE);
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
