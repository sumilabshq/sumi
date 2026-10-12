import { useState } from "react";
import type { MouseEvent, RefObject } from "react";
import type { Selection, Spot } from "../../../../schemas/selection.schema.js";
import { hitsAt, parentsOf, pickedHit } from "../../../layers/hits.js";
import type { PickDepth } from "../../../layers/hits.js";
import { layersIn } from "../../../layers/layer-tree.js";
import { seenLayersOf } from "../../../layers/seen-layers.js";
import { FRAME_OF, SCREEN_OF, hitRootOf, isSameSpot, screenBoxOf, spotOn } from "../../lib/spotlight.js";
import type { PanZoom } from "../camera/use-pan-zoom.js";

export interface CanvasSelection {
	readonly hovered: Spot | null;
	readonly pointing: {
		readonly onMouseMove: (event: MouseEvent) => void;
		readonly onMouseLeave: () => void;
		readonly onClick: (event: MouseEvent) => void;
		readonly onDoubleClick: (event: MouseEvent) => void;
	};
}

export interface Picking {
	readonly picked: Selection | null;
	readonly onPick: (selection: Selection | null) => void;
}

interface ScreenUnder {
	readonly element: HTMLElement;
	readonly widget: string;
}

const CHROME = "[data-canvas-chrome]";

export function useCanvasSelection(
	layerRef: RefObject<HTMLDivElement | null>,
	pan: PanZoom,
	{ picked, onPick }: Picking,
): CanvasSelection {
	const [hovered, setHovered] = useState<Spot | null>(null);
	const pickAt = (event: MouseEvent, depth: PickDepth): Selection | null => {
		const layer = layerRef.current;
		if (!layer || (event.target instanceof Element && event.target.closest(CHROME))) return null;
		const under = screenUnder(layer, event);
		const root = under ? hitRootOf(layer, under.element, under.widget) : null;
		if (!under || !root) return null;
		const seen = seenLayersOf(under.widget);
		const layers = seen.length > 0 ? seen : layersIn(root);
		if (layers.length === 0) return null;
		const drawn = under.element.getBoundingClientRect();
		const scale = drawn.width / Math.max(1, under.element.offsetWidth);
		const at = { x: (event.clientX - drawn.left) / scale, y: (event.clientY - drawn.top) / scale };
		const hit = pickedHit(hitsAt(root, layers, at), parentsOf(layers), picked?.mark ?? null, depth);
		if (!hit) return null;
		const spot = spotOn(screenBoxOf(layer, under.element, pan.lookNow().scale), hit);
		return { widget: under.widget, mark: spot.mark, spot };
	};
	const depthOf = (event: MouseEvent, depth: PickDepth): PickDepth =>
		event.metaKey || event.ctrlKey ? "deepest" : depth;
	return {
		hovered: hovered && hovered.mark !== picked?.mark ? hovered : null,
		pointing: {
			onMouseMove: (event) => {
				const next = pickAt(event, depthOf(event, "level"))?.spot ?? null;
				setHovered((shown) => (isSameSpot(shown, next) ? shown : next));
			},
			onMouseLeave: () => setHovered(null),
			onClick: (event) => {
				if (event.target instanceof Element && event.target.closest(CHROME)) return;
				onPick(pickAt(event, depthOf(event, "level")));
				setHovered(null);
			},
			onDoubleClick: (event) => {
				onPick(pickAt(event, depthOf(event, "deeper")));
				setHovered(null);
			},
		},
	};
}

function screenUnder(layer: HTMLElement, event: MouseEvent): ScreenUnder | null {
	for (const frame of layer.querySelectorAll<HTMLElement>(`[${FRAME_OF}]`)) {
		const element = frame.querySelector<HTMLElement>(`[${SCREEN_OF}]`);
		const drawn = element?.getBoundingClientRect();
		const widget = frame.getAttribute(FRAME_OF);
		if (!element || !drawn || !widget) continue;
		const isInside =
			event.clientX >= drawn.left &&
			event.clientX <= drawn.right &&
			event.clientY >= drawn.top &&
			event.clientY <= drawn.bottom;
		if (isInside) return { element, widget };
	}
	return null;
}
