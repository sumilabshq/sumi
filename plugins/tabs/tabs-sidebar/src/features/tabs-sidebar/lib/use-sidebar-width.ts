import { useState } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { layout } from "@widgetarium/layout/contract";

export interface SidebarWidth {
	readonly px: number;
	onWidth(px: number): void;
	onWidthDone(px: number): void;
}

const MOST_SHARE = 0.5;

export function useSidebarWidth(): SidebarWidth {
	const widths = useQuery(layout.frameWidths.frameWidths).data;
	const resizeEdge = useCommand(layout.frameWidths.resizeEdge);
	const [draggedPx, setDraggedPx] = useState<number | null>(null);
	const within = (px: number): number => Math.min(Math.max(px, widths.bounds.left.leastPx), mostPx());
	return {
		px: draggedPx ?? widths.left,
		onWidth: (px) => setDraggedPx(within(px)),
		onWidthDone: (px) => {
			setDraggedPx(null);
			void resizeEdge.run({
				edge: "left",
				px: within(px),
				mostPx: mostPx(),
			});
		},
	};
}

function mostPx(): number {
	return Math.round(window.innerWidth * MOST_SHARE);
}
