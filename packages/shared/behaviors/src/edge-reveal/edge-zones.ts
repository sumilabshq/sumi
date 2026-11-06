import { isNearCorner } from "./edge-intent.js";
import type { EdgeSide } from "./edge-intent.js";

export interface ViewPoint {
	readonly x: number;
	readonly y: number;
}

export interface ViewSize {
	readonly widthPx: number;
	readonly heightPx: number;
}

interface ViewBox {
	readonly left: number;
	readonly right: number;
	readonly top: number;
	readonly bottom: number;
}

const OPEN_REACH_PX = 120;
const KEEP_SIDE_PX = 150;
const KEEP_ACROSS_PX = 60;

export function isInsideView(point: ViewPoint, view: ViewSize): boolean {
	return point.x >= 0 && point.x <= view.widthPx && point.y >= 0 && point.y <= view.heightPx;
}

export function isInOpenStrip(point: ViewPoint, view: ViewSize, side: EdgeSide): boolean {
	if (isNearCorner(point.y, view.heightPx)) {
		return false;
	}

	if (side === "left") {
		return point.x < 0 && point.x >= -OPEN_REACH_PX;
	}

	return point.x > view.widthPx && point.x <= view.widthPx + OPEN_REACH_PX;
}

export function isInKeepZone(point: ViewPoint, panel: ViewBox, side: EdgeSide): boolean {
	const left = side === "left" ? panel.left - KEEP_SIDE_PX : panel.left;
	const right = side === "right" ? panel.right + KEEP_SIDE_PX : panel.right;
	const isAcross = point.y >= panel.top - KEEP_ACROSS_PX && point.y <= panel.bottom + KEEP_ACROSS_PX;
	return isAcross && point.x >= left && point.x <= right;
}
