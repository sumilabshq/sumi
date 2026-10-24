import type { TooltipSaid, TooltipSide } from "./tooltip-marks";
import type { TooltipAnchor, TooltipState } from "./tooltip-pointing";

export interface TooltipParts {
	readonly bubble: HTMLDivElement;
	readonly face: HTMLSpanElement;
	readonly arrow: HTMLSpanElement;
}

interface TooltipSize {
	readonly width: number;
	readonly height: number;
}

interface TooltipSizes {
	readonly tip: TooltipSize;
	readonly room: TooltipSize;
}

interface CrossAxis {
	readonly centre: number;
	readonly length: number;
	readonly reach: number;
}

interface TooltipPlace {
	readonly x: number;
	readonly y: number;
	readonly side: TooltipSide;
	readonly arrowAt: number;
}

const BESIDE_PX = 10;
const WINDOW_EDGE_PX = 8;
const ARROW_FROM_START_PX = 36;
const ARROW_FROM_EDGE_PX = 12;
const ARROW_HALF_PX = 4;
const OPPOSITE: Readonly<Record<TooltipSide, TooltipSide>> = {
	top: "bottom",
	bottom: "top",
	left: "right",
	right: "left",
};

export function layTooltip(parts: TooltipParts, state: TooltipState): void {
	if (state.anchor === null || state.said === null) {
		return;
	}

	const tip = naturalSizeOf(parts.face);
	const room = {
		width: document.documentElement.clientWidth,
		height: document.documentElement.clientHeight,
	};
	const place = placeTooltip(state.anchor, state.said, { tip, room });
	const arrowShift = isAcross(place.side) ? "translateX" : "translateY";
	parts.bubble.dataset["side"] = place.side;
	parts.face.style.width = `${tip.width}px`;
	parts.bubble.style.transform = `translate3d(${Math.round(place.x)}px, ${Math.round(place.y)}px, 0)`;
	parts.arrow.style.transform = `${arrowShift}(${Math.round(place.arrowAt - ARROW_HALF_PX)}px) rotate(45deg)`;
}

export function tooltipPartsOf(
	bubble: HTMLDivElement | null,
	face: HTMLSpanElement | null,
	arrow: HTMLSpanElement | null,
): TooltipParts | null {
	if (bubble === null || face === null || arrow === null) {
		return null;
	}

	return { bubble, face, arrow };
}

function isAcross(side: TooltipSide): boolean {
	return side === "top" || side === "bottom";
}

function mainOf(side: TooltipSide, anchor: TooltipAnchor, size: TooltipSize): number {
	if (side === "top") {
		return anchor.top - BESIDE_PX - size.height;
	}

	if (side === "bottom") {
		return anchor.bottom + BESIDE_PX;
	}

	if (side === "left") {
		return anchor.left - BESIDE_PX - size.width;
	}

	return anchor.right + BESIDE_PX;
}

function fitsOn(side: TooltipSide, anchor: TooltipAnchor, sizes: TooltipSizes): boolean {
	const main = mainOf(side, anchor, sizes.tip);
	const reach = isAcross(side) ? sizes.room.height - sizes.tip.height : sizes.room.width - sizes.tip.width;
	return main >= WINDOW_EDGE_PX && main <= reach - WINDOW_EDGE_PX;
}

function clamped(value: number, least: number, most: number): number {
	return Math.min(Math.max(value, least), Math.max(least, most));
}

function sideFitting(anchor: TooltipAnchor, said: TooltipSaid, sizes: TooltipSizes): TooltipSide {
	const opposite = OPPOSITE[said.side];
	if (!fitsOn(said.side, anchor, sizes) && fitsOn(opposite, anchor, sizes)) {
		return opposite;
	}

	return said.side;
}

function crossAxisOf(side: TooltipSide, anchor: TooltipAnchor, sizes: TooltipSizes): CrossAxis {
	if (isAcross(side)) {
		return { centre: (anchor.left + anchor.right) / 2, length: sizes.tip.width, reach: sizes.room.width };
	}

	return { centre: (anchor.top + anchor.bottom) / 2, length: sizes.tip.height, reach: sizes.room.height };
}

function placeTooltip(anchor: TooltipAnchor, said: TooltipSaid, sizes: TooltipSizes): TooltipPlace {
	const side = sideFitting(anchor, said, sizes);
	const main = mainOf(side, anchor, sizes.tip);
	const { centre, length, reach } = crossAxisOf(side, anchor, sizes);
	const isAlignedStart = said.align === "start" && isAcross(side);
	const cross = clamped(
		isAlignedStart ? centre - ARROW_FROM_START_PX : centre - length / 2,
		WINDOW_EDGE_PX,
		reach - WINDOW_EDGE_PX - length,
	);
	const arrowAt = clamped(centre - cross, ARROW_FROM_EDGE_PX, length - ARROW_FROM_EDGE_PX);
	if (isAcross(side)) {
		return { x: cross, y: main, side, arrowAt };
	}

	return { x: main, y: cross, side, arrowAt };
}

function naturalSizeOf(face: HTMLSpanElement): TooltipSize {
	const kept = face.style.width;
	face.style.transition = "none";
	face.style.width = "auto";
	const size = {
		width: face.offsetWidth,
		height: face.offsetHeight,
	};
	face.style.width = kept;
	face.getBoundingClientRect();
	face.style.transition = "";
	return size;
}
