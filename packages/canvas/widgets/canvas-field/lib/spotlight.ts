import type { Box, StageLook } from "@widgetarium/gpu";
import type { Spot } from "../../../schemas/selection.schema.js";
import { LIVE_SCREEN } from "../../canvas-ui/layers/hits.js";
import type { Hit } from "../../canvas-ui/layers/hits.js";

export const SCREEN_OF = "data-canvas-screen";
export const FRAME_OF = "data-canvas-frame";
export const LAYERS_OPEN = "[data-canvas-layers='open']";

const TOP_BAR_PX = 80;
const MARGIN_PX = 48;
const DRAWN_LIVE_FROM = 0.6;
const CLOSEST = 1;

export function firstScreenOf(layer: HTMLElement | null, widget: string): HTMLElement | null {
	const screen = layer?.querySelector(`[${FRAME_OF}="${CSS.escape(widget)}"] [${SCREEN_OF}]`);
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

export function lookOnto(target: Box, field: HTMLElement | null): StageLook {
	const panel = field?.closest("[data-canvas-view]")?.querySelector(LAYERS_OPEN);
	const left = panel instanceof HTMLElement ? panel.offsetWidth : 0;
	const width = (field?.clientWidth ?? 0) - left - 2 * MARGIN_PX;
	const height = (field?.clientHeight ?? 0) - TOP_BAR_PX - 2 * MARGIN_PX;
	const fitted = Math.min(width / target.width, height / target.height);
	const scale = Math.min(CLOSEST, Math.max(DRAWN_LIVE_FROM, fitted));
	return {
		scale,
		x: placedOn(left + MARGIN_PX, width, target.x, target.width, scale),
		y: placedOn(TOP_BAR_PX + MARGIN_PX, height, target.y, target.height, scale),
	};
}

function placedOn(start: number, room: number, at: number, size: number, scale: number): number {
	if (size * scale > room) return start - at * scale;
	return start + room / 2 - (at + size / 2) * scale;
}

export function hitRootOf(layer: HTMLElement, screen: HTMLElement, widget: string): HTMLElement | null {
	if (screen.querySelector("[data-wg-node]")) return screen;
	if (firstScreenOf(layer, widget) !== screen) return null;
	return document.querySelector<HTMLElement>(`[${LIVE_SCREEN}="${CSS.escape(widget)}"]`);
}
