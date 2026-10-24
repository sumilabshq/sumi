import { useRef } from "react";
import type { PointerEvent } from "react";
import type { PaneEdge } from "../../../shared/lib/pane-layout.js";

export interface EdgeDragAsk {
	readonly edge: PaneEdge;
	readonly gap: number;
	readonly shareWithin: (asked: number) => number;
	readonly onDrag: (edge: PaneEdge, share: number) => void;
	readonly onRelease: (share: number) => void;
}

export interface EdgeDragHandlers {
	readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerUp: () => void;
	readonly onLostPointerCapture: () => void;
}

interface EdgeHold {
	readonly board: DOMRect;
	share: number | null;
}

const PRIMARY_BUTTON = 0;

export function useEdgeDrag({ edge, gap, shareWithin, onDrag, onRelease }: EdgeDragAsk): EdgeDragHandlers {
	const held = useRef<EdgeHold | null>(null);
	const letGo = (): void => {
		const share = held.current?.share ?? null;
		held.current = null;

		if (share !== null) {
			onRelease(share);
		}
	};
	return {
		onPointerDown: (event) => {
			if (event.button !== PRIMARY_BUTTON) {
				return;
			}

			event.preventDefault();
			event.currentTarget.setPointerCapture(event.pointerId);
			held.current = {
				board: event.currentTarget.parentElement?.getBoundingClientRect() ?? new DOMRect(),
				share: null,
			};
		},
		onPointerMove: (event) => {
			const hold = held.current;

			if (hold !== null) {
				hold.share = shareWithin(shareUnder(event, hold.board, edge, gap));
				onDrag(edge, hold.share);
			}
		},
		onPointerUp: letGo,
		onLostPointerCapture: letGo,
	};
}

function shareUnder(event: PointerEvent<HTMLElement>, board: DOMRect, edge: PaneEdge, gap: number): number {
	const pointer = edge.dir === "row" ? event.clientX - board.left : event.clientY - board.top;
	return (pointer - edge.startPx - gap / 2) / edge.spanPx;
}
