import type { EdgeBounds, FrameBounds, FrameEdge, FrameWidths } from "../schema/frame-widths.schema.js";

export const PLATE_LEAST_PX = 320;

export const FRAME_BOUNDS: Readonly<Record<FrameEdge, EdgeBounds>> = {
	left: {
		leastPx: 200,
		usualPx: 268,
	},
	chat: {
		leastPx: PLATE_LEAST_PX,
		usualPx: 560,
	},
};

export const FRAME_LIMITS: FrameBounds = {
	...FRAME_BOUNDS,
	plateLeastPx: PLATE_LEAST_PX,
};

export const USUAL_WIDTHS: FrameWidths = {
	left: FRAME_BOUNDS.left.usualPx,
	chat: FRAME_BOUNDS.chat.usualPx,
};

export function edgePxWithin(edge: FrameEdge, askedPx: number, mostPx: number): number {
	const { leastPx } = FRAME_BOUNDS[edge];

	return Math.round(Math.max(leastPx, Math.min(askedPx, mostPx)));
}

export function widthsWithin(widths: FrameWidths): FrameWidths {
	return {
		left: Math.max(FRAME_BOUNDS.left.leastPx, widths.left),
		chat: Math.max(FRAME_BOUNDS.chat.leastPx, widths.chat),
	};
}
