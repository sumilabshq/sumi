import type { CanvasLayer } from "../../../shared/schema/layer.schema.js";

export function canDragLayer(layer: CanvasLayer, isLayoutLocked: boolean): boolean {
	return !layer.isHeld && (layer.kind === "widget" || !isLayoutLocked);
}

export function layerIn(layers: readonly CanvasLayer[], mark: string): CanvasLayer | null {
	for (const layer of layers) {
		const found = layer.mark === mark ? layer : layerIn(layer.children, mark);

		if (found) {
			return found;
		}
	}

	return null;
}
