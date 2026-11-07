import type { PageArea } from "@sumi/contract";

const BROWSER_ROOT = "[data-browser-root]";
const PAGE_AREA_MAX_PX = 16_384;

export function areaInRootOf(element: HTMLElement): PageArea {
	const box = element.getBoundingClientRect();
	const root = element.closest(BROWSER_ROOT)?.getBoundingClientRect() ?? { x: 0, y: 0 };
	return {
		x: pxOf(box.x - root.x),
		y: pxOf(box.y - root.y),
		width: pxOf(box.width),
		height: pxOf(box.height),
	};
}

function pxOf(measured: number): number {
	return Math.min(Math.max(Math.round(measured), 0), PAGE_AREA_MAX_PX);
}
