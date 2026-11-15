import type { FrameEdge } from "@widgetarium/layout/contract";

export const FRAME_WIDTH_VARS: Readonly<Record<FrameEdge, string>> = {
	left: "--wg-shell-left",
	chat: "--wg-shell-chat",
};

export const DRAGGED_WIDTH_VARS: Readonly<Record<FrameEdge, string>> = {
	left: "--wg-shell-left-dragged",
	chat: "--wg-shell-chat-dragged",
};
