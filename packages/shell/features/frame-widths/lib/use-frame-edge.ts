import { useState } from "react";
import { useEdgeResize } from "@widgetarium/behaviors";
import type { EdgeResizeHandlers } from "@widgetarium/behaviors";
import { useCommand } from "@widgetarium/core/requests";
import type { FrameEdge } from "../../../shared/schema/frame-widths.schema.js";
import { ResetFrameEdgeCommand, ResizeFrameEdgeCommand } from "../contract.js";
import { FrameEdgeDrag } from "./frame-edge-drag.js";

interface PressOnEdge {
	readonly currentTarget: HTMLElement;
}

interface DragTrack {
	readonly press: (edgeElement: HTMLElement) => void;
	readonly settle: () => void;
}

export function useFrameEdge(edge: FrameEdge, px: number): EdgeResizeHandlers {
	const resize = useCommand(ResizeFrameEdgeCommand);
	const reset = useCommand(ResetFrameEdgeCommand);
	const [drag] = useState(() => new FrameEdgeDrag());
	const handlers = useEdgeResize({
		widthOf: () => drag.widthOr(px),
		edge: "end",
		onResize: (asked) => drag.drawWidth(edge, asked),
		onReset: () => void reset.run({ edge, mostPx: drag.endForReset(edge, px) }),
	});
	return handlersTracking(handlers, {
		press: (edgeElement) => drag.press(edge, edgeElement, px),
		settle: () => drag.settle((moved) => void resize.run({ edge, ...moved })),
	});
}

function handlersTracking(handlers: EdgeResizeHandlers, track: DragTrack): EdgeResizeHandlers {
	return {
		...handlers,
		onPointerDown: pressedThen(track, handlers.onPointerDown),
		onPointerUp: settledAfter(track, handlers.onPointerUp),
		onLostPointerCapture: settledAfter(track, handlers.onLostPointerCapture),
		onKeyDown: pressedThen(track, settledAfter(track, handlers.onKeyDown)),
	};
}

function pressedThen<E extends PressOnEdge>({ press }: DragTrack, step: (event: E) => void): (event: E) => void {
	return (event) => {
		press(event.currentTarget);
		step(event);
	};
}

function settledAfter<A extends readonly unknown[]>(
	{ settle }: DragTrack,
	step: (...args: A) => void,
): (...args: A) => void {
	return (...args) => {
		step(...args);
		settle();
	};
}
