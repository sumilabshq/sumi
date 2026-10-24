import { useRef } from "react";
import type { KeyboardEvent, PointerEvent } from "react";

export type ResizedEdge = "end" | "start";

export interface EdgeResizeAsk {
	readonly widthOf: () => number;
	readonly edge?: ResizedEdge;
	readonly onResize: (px: number) => void;
	readonly onReset: () => void;
}

export interface EdgeResizeHandlers {
	readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerUp: () => void;
	readonly onLostPointerCapture: () => void;
	readonly onDoubleClick: () => void;
	readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
}

interface EdgeDrag {
	readonly fromX: number;
	readonly fromPx: number;
}

const GROWS_BY: Readonly<Record<ResizedEdge, number>> = {
	end: 1,
	start: -1,
};

const PRIMARY_BUTTON = 0;

const RESET_KEY = "Enter";

const KEY_STEP_PX: Readonly<Record<string, number>> = {
	ArrowLeft: -16,
	ArrowRight: 16,
};

const KEY_TO_EDGE_PX: Readonly<Record<string, number>> = {
	Home: 0,
	End: Number.MAX_SAFE_INTEGER,
};

export function useEdgeResize({ widthOf, edge = "end", onResize, onReset }: EdgeResizeAsk): EdgeResizeHandlers {
	const drag = useRef<EdgeDrag | null>(null);
	const letGo = (): void => {
		drag.current = null;
	};
	return {
		onPointerDown: (event) => {
			drag.current = dragStartedBy(event, widthOf);
		},
		onPointerMove: (event) => {
			if (drag.current) {
				onResize(drag.current.fromPx + (event.clientX - drag.current.fromX) * GROWS_BY[edge]);
			}
		},
		onPointerUp: letGo,
		onLostPointerCapture: letGo,
		onDoubleClick: onReset,
		onKeyDown: (event) => keyedBy(event, { widthOf, edge, onResize, onReset }),
	};
}

function dragStartedBy(event: PointerEvent<HTMLElement>, widthOf: () => number): EdgeDrag | null {
	if (event.button !== PRIMARY_BUTTON) {
		return null;
	}

	event.preventDefault();
	event.currentTarget.setPointerCapture(event.pointerId);
	return {
		fromX: event.clientX,
		fromPx: widthOf(),
	};
}

function keyedBy(event: KeyboardEvent<HTMLElement>, { widthOf, edge = "end", onResize, onReset }: EdgeResizeAsk): void {
	if (event.key === RESET_KEY) {
		event.preventDefault();
		onReset();
		return;
	}

	const asked = keyedWidthOf(event.key, widthOf, GROWS_BY[edge]);
	if (asked === null) {
		return;
	}

	event.preventDefault();
	onResize(asked);
}

function keyedWidthOf(key: string, widthOf: () => number, grows: number): number | null {
	const step = KEY_STEP_PX[key];
	if (step !== undefined) {
		return widthOf() + step * grows;
	}

	return KEY_TO_EDGE_PX[key] ?? null;
}
