import type { FrameEdge, FrameWidths } from "../schema/frame-widths.schema.js";

export interface EdgeBoundsPx {
	readonly leastPx: number;
	readonly usualPx: number;
}

export const PLATE_LEAST_PX = 320;

export const FRAME_BOUNDS: Readonly<Record<FrameEdge, EdgeBoundsPx>> = {
	left: {
		leastPx: 200,
		usualPx: 268,
	},
	chat: {
		leastPx: PLATE_LEAST_PX,
		usualPx: 560,
	},
};

export const USUAL_WIDTHS: FrameWidths = {
	left: FRAME_BOUNDS.left.usualPx,
	chat: FRAME_BOUNDS.chat.usualPx,
};

export function edgePxWithin(edge: FrameEdge, askedPx: number, mostPx: number): number {
	const { leastPx } = FRAME_BOUNDS[edge];

	return Math.round(Math.max(leastPx, Math.min(askedPx, mostPx)));
}
