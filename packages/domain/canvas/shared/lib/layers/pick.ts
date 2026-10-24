import type { Selection } from "../../schema/selection.schema.js";
import type { CanvasStore } from "../view/canvas-store.js";
import { openedTo } from "./opened-to.js";

export function pickIn(canvasStore: CanvasStore, selection: Selection | null): void {
	const closedLayers = openedTo(canvasStore.now(), selection);
	canvasStore.change({ selection, closedLayers }, selection ? `pick ${selection.mark}` : "clear the pick");
}
