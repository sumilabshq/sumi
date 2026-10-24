import { useLayoutEffect, useRef } from "react";
import { useCommand } from "@widgetarium/core/requests";
import type { PaneEdge } from "./pane-layout.js";
import { ResizePaneSplitCommand } from "@widgetarium/layout";

export function useOpensChatAt(chatPx: number, edges: readonly PaneEdge[], plateLeastPx: number): void {
	const resize = useCommand(ResizePaneSplitCommand);
	const isOpened = useRef(false);
	const chatEdge = edges.find((edge) => edge.isChatEdge && edge.spanPx > 0);
	useLayoutEffect(() => {
		if (isOpened.current || chatEdge === undefined) {
			return;
		}

		isOpened.current = true;
		const least = plateLeastPx / chatEdge.spanPx;
		void resize.run({
			splitId: chatEdge.splitId,
			at: chatEdge.at,
			share: Math.min(Math.max(chatPx / chatEdge.spanPx, least), chatEdge.pairShare - least),
		});
	}, [chatEdge, chatPx, plateLeastPx, resize]);
}
