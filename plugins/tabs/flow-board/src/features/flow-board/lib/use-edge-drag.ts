import { useState } from "react";
import type { RefObject } from "react";
import { useCommand } from "@widgetarium/data-framework";
import { navigation } from "@widgetarium/navigation/contract";
import { trackPointer } from "@sumi/flow-strip-plugin";
import type { Point, SplitEdge } from "@sumi/flow-strip-plugin";
import { sharesAfterDrag } from "./edge-shares.js";
import type { EdgeDraft } from "./edge-shares.js";

export interface EdgeScope {
	readonly window: string;
	readonly flowId: string;
}

export interface EdgeDrag {
	readonly draft: EdgeDraft | null;
	readonly begin: (edge: SplitEdge) => void;
}

export function useEdgeDrag(board: RefObject<HTMLElement | null>, scope: EdgeScope): EdgeDrag {
	const resize = useCommand(navigation.flowPanes.resize);
	const [draft, setDraft] = useState<EdgeDraft | null>(null);
	const begin = (edge: SplitEdge): void => {
		const latest: { current: readonly number[] | null } = { current: null };
		trackPointer({
			onMove: (point) => {
				const rect = board.current?.getBoundingClientRect();

				if (rect !== undefined) {
					latest.current = sharesAfterDrag(edge, fractionOf(rect, edge, point));
					setDraft({ splitId: edge.splitId, shares: latest.current });
				}
			},
			onEnd: (point) => {
				const share = latest.current?.[edge.at];

				if (point === null || share === undefined) {
					setDraft(null);
					return;
				}

				void resize.run({ ...scope, splitId: edge.splitId, at: edge.at, share }).then(() => setDraft(null));
			},
		});
	};
	return { draft, begin };
}

function fractionOf(rect: DOMRect, edge: SplitEdge, point: Point): number {
	const { frame } = edge;
	const isRow = edge.dir === "row";
	const along = isRow ? (point.x - rect.left) / rect.width : (point.y - rect.top) / rect.height;
	const start = isRow ? frame.left : frame.top;
	const size = isRow ? frame.width : frame.height;
	return Math.min(Math.max((along - start) / size, 0), 1);
}
