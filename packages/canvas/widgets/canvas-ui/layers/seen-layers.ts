import type { Layer } from "./layer-tree.js";

// TRADE-OFF: one module-wide map; the layers panel reads a page's live copy and pointing on the canvas needs the same tree
const LAYERS_SEEN = new Map<string, readonly Layer[]>();

export function seenLayersOf(widget: string): readonly Layer[] {
	return LAYERS_SEEN.get(widget) ?? [];
}

export function isSeenAlready(widget: string, layers: readonly Layer[]): boolean {
	return JSON.stringify(layers) === JSON.stringify(LAYERS_SEEN.get(widget) ?? null);
}

export function keepSeenLayers(widget: string, layers: readonly Layer[]): void {
	LAYERS_SEEN.set(widget, layers);
}

export function heldSeenLayers(widget: string): readonly Layer[] | null {
	return LAYERS_SEEN.get(widget) ?? null;
}
