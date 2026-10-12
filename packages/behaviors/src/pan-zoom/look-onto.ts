import type { Box, StageLook } from "@widgetarium/gpu";

export interface LookRoom {
	readonly top: number;
	readonly margin: number;
	readonly least: number;
	readonly most: number;
	readonly view: string;
	readonly coveredBy: string;
}

export function lookOnto(target: Box, field: HTMLElement | null, room: LookRoom): StageLook {
	const panel = field?.closest(room.view)?.querySelector(room.coveredBy);
	const left = panel instanceof HTMLElement ? panel.offsetWidth : 0;
	const width = (field?.clientWidth ?? 0) - left - 2 * room.margin;
	const height = (field?.clientHeight ?? 0) - room.top - 2 * room.margin;
	const fitted = Math.min(width / target.width, height / target.height);
	const scale = Math.min(room.most, Math.max(room.least, fitted));
	return {
		scale,
		x: placedOn(left + room.margin, width, target.x, target.width, scale),
		y: placedOn(room.top + room.margin, height, target.y, target.height, scale),
	};
}

export function boxInLayer(layer: HTMLElement, element: HTMLElement): Box {
	const origin = layer.getBoundingClientRect();
	const drawn = element.getBoundingClientRect();
	const scale = drawn.width / Math.max(1, element.offsetWidth);
	return {
		x: (drawn.left - origin.left) / scale,
		y: (drawn.top - origin.top) / scale,
		width: element.offsetWidth,
		height: element.offsetHeight,
	};
}

function placedOn(start: number, room: number, at: number, size: number, scale: number): number {
	if (size * scale > room) return start - at * scale;
	return start + room / 2 - (at + size / 2) * scale;
}
