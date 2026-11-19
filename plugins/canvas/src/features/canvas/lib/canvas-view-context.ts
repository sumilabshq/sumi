import { createContext, useContext } from "react";
import type { ZoomStore } from "./zoom-store.js";

export interface CanvasViewState {
	readonly tabId: string;
	readonly canvasId: string;
	readonly pickedBoardId: string | null;
	readonly zoom: ZoomStore;
	pickBoard(boardId: string | null): void;
}

export const CanvasViewStateContext = createContext<CanvasViewState | null>(null);

export function useCanvasView(): CanvasViewState {
	const view = useContext(CanvasViewStateContext);

	if (view === null) {
		throw new Error("a canvas block was drawn outside CanvasPage, which provides the canvas it shows");
	}

	return view;
}
