import type { CanvasState } from "../view/canvas-state.js";

export function showPage(state: CanvasState, page: string): void {
	state.change({ page }, `show ${page}`);
}
