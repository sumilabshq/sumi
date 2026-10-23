import { PLATE_LEAST_PX } from "../../../shared/lib/frame-bounds.js";
import { FRAME_WIDTH_VARS } from "../../../shared/lib/frame-width-vars.js";
import type { FrameEdge } from "../../../shared/schema/frame-widths.schema.js";

interface EdgeDrag {
	readonly frame: HTMLElement;
	readonly sized: Element;
	readonly mostPx: number;
	hasMoved: boolean;
}

export interface MovedEdge {
	readonly px: number;
	readonly mostPx: number;
}

const FRAME = "[data-shell-frame]";
const GIVING_PLATES: Readonly<Record<FrameEdge, string>> = {
	left: '[data-shell-plate="app"], [data-shell-plate="chat"]',
	chat: '[data-shell-plate="app"]',
};

export class FrameEdgeDrag {
	private held: EdgeDrag | null = null;
	private pressedEdge: HTMLElement | null = null;

	press(edge: FrameEdge, edgeElement: HTMLElement, px: number): void {
		this.pressedEdge = edgeElement;
		this.held = dragFrom(edge, edgeElement, px);
	}

	widthOr(px: number): number {
		return this.held?.sized.getBoundingClientRect().width ?? px;
	}

	drawWidth(edge: FrameEdge, asked: number): void {
		const held = this.held;
		if (held === null) {
			return;
		}

		held.hasMoved = true;
		held.frame.style.setProperty(FRAME_WIDTH_VARS[edge], `${asked}px`);
	}

	settle(onMoved: (moved: MovedEdge) => void): void {
		const ended = this.held;
		this.held = null;
		if (ended === null || !ended.hasMoved) {
			return;
		}

		onMoved({ px: ended.sized.getBoundingClientRect().width, mostPx: ended.mostPx });
	}

	endForReset(edge: FrameEdge, px: number): number {
		const pressed = this.pressedEdge;
		this.held = null;
		if (pressed === null) {
			return px;
		}

		return dragFrom(edge, pressed, px)?.mostPx ?? px;
	}
}

function dragFrom(edge: FrameEdge, edgeElement: HTMLElement, px: number): EdgeDrag | null {
	const frame = edgeElement.closest<HTMLElement>(FRAME);
	const sized = edgeElement.previousElementSibling ?? edgeElement.parentElement?.previousElementSibling ?? null;
	if (frame === null || sized === null) {
		return null;
	}

	return {
		frame,
		sized,
		mostPx: px + sparePxOf(frame, edge),
		hasMoved: false,
	};
}

function sparePxOf(frame: HTMLElement, edge: FrameEdge): number {
	return [...frame.querySelectorAll(GIVING_PLATES[edge])].reduce(
		(spare, plate) => spare + Math.max(0, plate.getBoundingClientRect().width - PLATE_LEAST_PX),
		0,
	);
}
