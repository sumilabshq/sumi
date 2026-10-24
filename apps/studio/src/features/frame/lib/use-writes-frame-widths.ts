import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import type { FrameWidths } from "@widgetarium/layout";
import { FRAME_WIDTH_VARS } from "../../frame-widths/lib/frame-width-vars.js";

export function useWritesFrameWidths(frame: RefObject<HTMLDivElement | null>, widths: FrameWidths): void {
	useLayoutEffect(() => {
		frame.current?.style.setProperty(FRAME_WIDTH_VARS.left, `${widths.left}px`);
		frame.current?.style.setProperty(FRAME_WIDTH_VARS.chat, `${widths.chat}px`);
	}, [frame, widths.left, widths.chat]);
}
