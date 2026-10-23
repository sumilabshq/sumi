import { createElement as h, useRef } from "react";
import type { PointerEvent, ReactElement } from "react";
import { useCommand } from "@widgetarium/core/requests";
import { FRAME_BOUNDS, PLATE_LEAST_PX } from "../../../../shared/lib/frame-bounds.js";
import type { PaneEdge } from "../../../../shared/lib/pane-layout.js";
import { ResizePaneSplitCommand } from "../../contract.js";

export interface PaneSplitEdgeProps {
	readonly edge: PaneEdge;
	readonly gap: number;
	readonly onDrag: (edge: PaneEdge, share: number) => void;
	readonly onChatPx: (px: number, mostPx: number) => void;
}

interface EdgeHold {
	readonly board: DOMRect;
	share: number | null;
}

const PRIMARY_BUTTON = 0;
const RESIZE_LABEL = "Resize panes";
const CHAT_EDGE = "chat";

export function PaneSplitEdge({ edge, gap, onDrag, onChatPx }: PaneSplitEdgeProps): ReactElement {
	const resize = useCommand(ResizePaneSplitCommand);
	const held = useRef<EdgeHold | null>(null);
	const isRow = edge.dir === "row";
	const least = PLATE_LEAST_PX / edge.spanPx;
	const shareWithin = (asked: number): number => Math.min(Math.max(asked, least), edge.pairShare - least);
	const commit = (share: number): void => {
		void resize.run({
			splitId: edge.splitId,
			at: edge.at,
			share,
		});

		if (edge.isChatEdge) {
			onChatPx(share * edge.spanPx, (edge.pairShare - least) * edge.spanPx);
		}
	};
	const letGo = (): void => {
		const share = held.current?.share ?? null;
		held.current = null;

		if (share !== null) {
			commit(share);
		}
	};
	return (
		<div
			className="wg-pane-edge"
			data-pane-edge={`${edge.splitId}:${edge.at}`}
			data-pane-edge-dir={edge.dir}
			data-shell-edge={edge.isChatEdge ? CHAT_EDGE : undefined}
			role="separator"
			aria-label={RESIZE_LABEL}
			aria-orientation={isRow ? "vertical" : "horizontal"}
			style={{
				left: edge.rect.left,
				top: edge.rect.top,
				width: isRow ? undefined : edge.rect.width,
				height: isRow ? edge.rect.height : undefined,
			}}
			onPointerDown={(event) => {
				if (event.button !== PRIMARY_BUTTON) {
					return;
				}

				event.preventDefault();
				event.currentTarget.setPointerCapture(event.pointerId);
				held.current = {
					board: event.currentTarget.parentElement?.getBoundingClientRect() ?? new DOMRect(),
					share: null,
				};
			}}
			onPointerMove={(event) => {
				const hold = held.current;

				if (hold !== null) {
					hold.share = shareWithin(shareUnder(event, hold.board, edge, gap));
					onDrag(edge, hold.share);
				}
			}}
			onPointerUp={letGo}
			onLostPointerCapture={letGo}
			onDoubleClick={() =>
				commit(shareWithin(edge.isChatEdge ? FRAME_BOUNDS.chat.usualPx / edge.spanPx : edge.pairShare / 2))
			}
		/>
	);
}

function shareUnder(event: PointerEvent<HTMLElement>, board: DOMRect, edge: PaneEdge, gap: number): number {
	const pointer = edge.dir === "row" ? event.clientX - board.left : event.clientY - board.top;
	return (pointer - edge.startPx - gap / 2) / edge.spanPx;
}
