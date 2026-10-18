import type { MouseEvent } from "react";

export interface PointerSpot {
	readonly x: number;
	readonly y: number;
	readonly layer: HTMLElement;
}

export function pointerSpotOf(event: MouseEvent<HTMLElement>): PointerSpot {
	return {
		x: event.clientX,
		y: event.clientY,
		layer: overlayLayerOf(event.currentTarget.ownerDocument),
	};
}

function overlayLayerOf(page: Document): HTMLElement {
	return page.body.querySelector<HTMLElement>(":scope > .wg-kit-portal-layer") ?? page.body;
}
