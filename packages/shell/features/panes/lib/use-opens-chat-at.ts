import { useLayoutEffect, useRef } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { PLATE_LEAST_PX } from "@widgetarium/layout";
import type { PaneEdge } from "../../../shared/lib/pane-layout.js";
import { ResizePaneSplitCommand } from "@widgetarium/layout";

export function useOpensChatAt(chatPx: number, edges: readonly PaneEdge[]): void {
	const resize = useCommand(ResizePaneSplitCommand);
	const isOpened = useRef(false);
	const chatEdge = edges.find((edge) => edge.isChatEdge && edge.spanPx > 0);
	useLayoutEffect(() => {
		if (isOpened.current || chatEdge === undefined) {
			return;
		}

		isOpened.current = true;
		const least = PLATE_LEAST_PX / chatEdge.spanPx;
		void resize.run({
			splitId: chatEdge.splitId,
			at: chatEdge.at,
			share: Math.min(Math.max(chatPx / chatEdge.spanPx, least), chatEdge.pairShare - least),
		});
	}, [chatEdge, chatPx, resize]);
}
