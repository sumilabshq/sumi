import { useMemo, useState } from "react";
import type { MouseEvent, RefObject } from "react";
import { hitsAt, parentsOf, pickedHit } from "../marked-layers/hits.js";
import type { PickDepth } from "../marked-layers/hits.js";
import { cachedLayersIn } from "../marked-layers/layers-cache.js";
import { hitRootOf, isSameSpot, screenBoxOf, spotOn } from "./spotlight.js";
import type { PointedPick, PointingMarks, Spot } from "./pointing-marks.js";

export interface Pointing {
	readonly marks: PointingMarks;
	readonly scaleNow: () => number;
	readonly picked: string | null;
	readonly onPick: (pick: PointedPick | null) => void;
}

export interface PointerHandlers {
	readonly onMouseMove: (event: MouseEvent) => void;
	readonly onMouseLeave: () => void;
	readonly onClick: (event: MouseEvent) => void;
	readonly onDoubleClick: (event: MouseEvent) => void;
}

export interface PointedLayer {
	readonly hovered: Spot | null;
	readonly handlers: PointerHandlers;
}

interface ScreenUnder {
	readonly element: HTMLElement;
	readonly widget: string;
}

export function usePointedLayer(layerRef: RefObject<HTMLElement | null>, pointing: Pointing): PointedLayer {
	const [hovered, setHovered] = useState<Spot | null>(null);
	const { marks, scaleNow, picked, onPick } = pointing;
	const handlers = useMemo((): PointerHandlers => {
		const pickAt = (event: MouseEvent, depth: PickDepth): PointedPick | null =>
			pickUnder(layerRef.current, event, { marks, scaleNow, picked, depth: depthOf(event, depth) });
		return {
			onMouseMove: (event) => {
				const next = pickAt(event, "level")?.spot ?? null;
				setHovered((shown) => (isSameSpot(shown, next) ? shown : next));
			},
			onMouseLeave: () => setHovered(null),
			onClick: (event) => {
				if (event.target instanceof Element && event.target.closest(marks.chrome)) return;
				onPick(pickAt(event, "level"));
				setHovered(null);
			},
			onDoubleClick: (event) => {
				onPick(pickAt(event, "deeper"));
				setHovered(null);
			},
		};
	}, [layerRef, marks, scaleNow, picked, onPick]);
	return { hovered: hovered && hovered.mark !== picked ? hovered : null, handlers };
}

interface PickAsk {
	readonly marks: PointingMarks;
	readonly scaleNow: () => number;
	readonly picked: string | null;
	readonly depth: PickDepth;
}

function pickUnder(layer: HTMLElement | null, event: MouseEvent, ask: PickAsk): PointedPick | null {
	if (!layer || (event.target instanceof Element && event.target.closest(ask.marks.chrome))) return null;
	const under = screenUnder(layer, event, ask.marks);
	const root = under ? hitRootOf(layer, under.element, under.widget, ask.marks) : null;
	if (!under || !root) return null;
	const layers = cachedLayersIn(root);
	if (layers.length === 0) return null;
	const drawn = under.element.getBoundingClientRect();
	const scale = drawn.width / Math.max(1, under.element.offsetWidth);
	const at = { x: (event.clientX - drawn.left) / scale, y: (event.clientY - drawn.top) / scale };
	const hit = pickedHit(hitsAt(root, layers, at), parentsOf(layers), ask.picked, ask.depth);
	if (!hit) return null;
	const spot = spotOn(screenBoxOf(layer, under.element, ask.scaleNow()), hit);
	return { widget: under.widget, mark: spot.mark, spot };
}

function depthOf(event: MouseEvent, depth: PickDepth): PickDepth {
	return event.metaKey || event.ctrlKey ? "deepest" : depth;
}

function screenUnder(layer: HTMLElement, event: MouseEvent, marks: PointingMarks): ScreenUnder | null {
	for (const frame of layer.querySelectorAll<HTMLElement>(`[${marks.frame}]`)) {
		const element = frame.querySelector<HTMLElement>(`[${marks.screen}]`);
		const drawn = element?.getBoundingClientRect();
		const widget = frame.getAttribute(marks.frame);
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
