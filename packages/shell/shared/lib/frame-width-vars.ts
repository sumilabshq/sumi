import type { FrameEdge } from "../schema/frame-widths.schema.js";

export const FRAME_WIDTH_VARS: Readonly<Record<FrameEdge, string>> = {
	left: "--wg-shell-left",
	chat: "--wg-shell-chat",
};
