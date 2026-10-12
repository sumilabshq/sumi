import { useEffect, useMemo, useRef } from "react";
import { createCanvasState, showPage } from "@widgetarium/canvas";
import type { CanvasOpening, CanvasState, FrameSize } from "@widgetarium/canvas";

export interface CanvasHandle {
	readonly showPage: (page: string) => void;
}

export interface CanvasStateFollowed {
	readonly app: string;
	readonly opening: CanvasOpening;
	readonly size: FrameSize;
	readonly onKept?: ((kept: CanvasOpening) => void) | undefined;
	readonly onCanvas?: ((canvas: CanvasHandle) => void) | undefined;
}

export function useCanvasState({ app, opening, size, onKept, onCanvas }: CanvasStateFollowed): CanvasState {
	const state = useMemo(() => createCanvasState(opening), [app]);
	useOpeningKept(state, onKept);
	useCanvasHandedOver(state, onCanvas);
	useViewportFollowed(state, size);
	return state;
}

function useOpeningKept(state: CanvasState, onKept: ((kept: CanvasOpening) => void) | undefined): void {
	const kept = useRef(onKept);
	kept.current = onKept;
	useEffect(
		() =>
			state.watch(["page", "isLayersOpen", "mode"], () => {
				const { page, isLayersOpen, mode } = state.now();
				kept.current?.({ page, isLayersOpen, mode });
			}),
		[state],
	);
}

function useCanvasHandedOver(state: CanvasState, onCanvas: ((canvas: CanvasHandle) => void) | undefined): void {
	useEffect(() => onCanvas?.({ showPage: (page) => showPage(state, page) }), [state, onCanvas]);
}

function useViewportFollowed(state: CanvasState, size: FrameSize): void {
	useEffect(() => state.change({ viewport: size }, "the canvas has new room"), [state, size.width, size.height]);
}
