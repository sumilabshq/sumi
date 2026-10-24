import type { Box } from "@widgetarium/gpu";
import { NODE_MARK } from "@widgetarium/core/engine/node-marks.js";
import type { Hit } from "../marked-layers/hits.js";
import type { PointingMarks, Spot } from "./pointing-marks.js";

export function firstScreenOf(layer: HTMLElement | null, widget: string, marks: PointingMarks): HTMLElement | null {
	const screen = layer?.querySelector(`[${marks.frame}="${CSS.escape(widget)}"] [${marks.screen}]`);
	return screen instanceof HTMLElement ? screen : null;
}

export function screenBoxOf(layer: HTMLElement, screen: HTMLElement, scale: number): Box {
	const origin = layer.getBoundingClientRect();
	const drawn = screen.getBoundingClientRect();
	return {
		x: (drawn.left - origin.left) / scale,
		y: (drawn.top - origin.top) / scale,
		width: drawn.width / scale,
		height: drawn.height / scale,
	};
}

export function spotOn(screen: Box, hit: Hit): Spot {
	return {
		mark: hit.mark,
		screen,
		target: { ...hit.box, x: screen.x + hit.box.x, y: screen.y + hit.box.y },
		radius: hit.radius,
	};
}

export function isSameSpot(a: Spot | null, b: Spot | null): boolean {
	return a?.mark === b?.mark && a?.target.x === b?.target.x && a?.target.y === b?.target.y;
}

export function hitRootOf(
	layer: HTMLElement,
	screen: HTMLElement,
	widget: string,
	marks: PointingMarks,
): HTMLElement | null {
	if (screen.querySelector(`[${NODE_MARK}]`)) return screen;
	if (firstScreenOf(layer, widget, marks) !== screen) return null;
	return document.querySelector<HTMLElement>(`[${marks.liveScreen}="${CSS.escape(widget)}"]`);
}
