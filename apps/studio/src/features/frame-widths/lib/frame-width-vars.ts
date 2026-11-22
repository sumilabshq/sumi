import type { FrameEdge } from "@widgetarium/layout/contract";

export const FRAME_WIDTH_VARS: Readonly<Record<FrameEdge, string>> = {
	left: "--shell-left",
	chat: "--shell-chat",
};

export const DRAGGED_WIDTH_VARS: Readonly<Record<FrameEdge, string>> = {
	left: "--shell-left-dragged",
	chat: "--shell-chat-dragged",
};
