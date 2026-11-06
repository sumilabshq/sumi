import { useLayoutEffect, useRef } from "react";
import { useCommand } from "@widgetarium/framework";
import type { PaneEdge } from "./pane-layout.js";
import { ResizePaneSplitCommand } from "@widgetarium/layout";

export interface ChatOpening {
	readonly chatPx: number;
	readonly edges: readonly PaneEdge[];
	readonly plateLeastPx: number;
	readonly isChatSettled: boolean;
}

export function useOpensChatAt({ chatPx, edges, plateLeastPx, isChatSettled }: ChatOpening): void {
	const resize = useCommand(ResizePaneSplitCommand);
	const isOpened = useRef(false);
	const chatEdge = edges.find((edge) => edge.isChatEdge && edge.spanPx > 0);
	useLayoutEffect(() => {
		if (isOpened.current || !isChatSettled || chatEdge === undefined) {
			return;
		}

		isOpened.current = true;
		const least = plateLeastPx / chatEdge.spanPx;
		void resize.run({
			splitId: chatEdge.splitId,
			at: chatEdge.at,
			share: Math.min(Math.max(chatPx / chatEdge.spanPx, least), chatEdge.pairShare - least),
		});
	}, [chatEdge, chatPx, plateLeastPx, isChatSettled, resize]);
}
