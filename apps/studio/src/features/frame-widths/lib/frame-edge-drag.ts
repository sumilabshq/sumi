import { DRAGGED_WIDTH_VARS, FRAME_WIDTH_VARS } from "./frame-width-vars.js";
import type { FrameEdge } from "@widgetarium/layout/contract";

interface EdgePress {
	readonly edge: FrameEdge;
	readonly edgeElement: HTMLElement;
	readonly px: number;
}

interface EdgeDrag {
	readonly edge: FrameEdge;
	readonly frame: HTMLElement;
	readonly sized: HTMLElement;
	readonly draggedWidthTargets: readonly HTMLElement[];
	readonly mostPx: number;
	hasMoved: boolean;
}

export interface MovedEdge {
	readonly px: number;
	readonly mostPx: number;
}

const FRAME = "[data-shell-frame]";
const SIDE_PANEL = ":scope > [data-shell-side]";
const GIVING_PLATES: Readonly<Record<FrameEdge, string>> = {
	left: '[data-shell-plate="app"], [data-shell-plate="chat"]',
	chat: '[data-shell-plate="app"]',
};

export class FrameEdgeDrag {
	private held: EdgeDrag | null = null;
	private pressedEdge: HTMLElement | null = null;

	constructor(private readonly plateLeastPx: number) {}

	press(edge: FrameEdge, edgeElement: HTMLElement, px: number): void {
		this.pressedEdge = edgeElement;
		undrawDragged(this.held);
		this.held = dragFrom({ edge, edgeElement, px }, this.plateLeastPx);
	}

	widthOr(px: number): number {
		return this.held?.sized.getBoundingClientRect().width ?? px;
	}

	drawWidth(asked: number): void {
		const held = this.held;
		if (held === null) {
			return;
		}

		held.hasMoved = true;

		for (const target of held.draggedWidthTargets) {
			target.style.setProperty(DRAGGED_WIDTH_VARS[held.edge], `${asked}px`);
		}
	}

	settle(onMoved: (moved: MovedEdge) => void): void {
		const ended = this.held;
		this.held = null;
		if (ended === null || !ended.hasMoved) {
			return;
		}

		const settledPx = ended.sized.getBoundingClientRect().width;
		ended.frame.style.setProperty(FRAME_WIDTH_VARS[ended.edge], `${settledPx}px`);
		undrawDragged(ended);
		onMoved({ px: settledPx, mostPx: ended.mostPx });
	}

	endForReset(edge: FrameEdge, px: number): number {
		const pressed = this.pressedEdge;
		undrawDragged(this.held);
		this.held = null;
		if (pressed === null) {
			return px;
		}

		return dragFrom({ edge, edgeElement: pressed, px }, this.plateLeastPx)?.mostPx ?? px;
	}
}

function undrawDragged(drag: EdgeDrag | null): void {
	if (drag === null) {
		return;
	}

	for (const target of drag.draggedWidthTargets) {
		target.style.removeProperty(DRAGGED_WIDTH_VARS[drag.edge]);
	}
}

function dragFrom({ edge, edgeElement, px }: EdgePress, plateLeastPx: number): EdgeDrag | null {
	const frame = edgeElement.closest<HTMLElement>(FRAME);
	const sized = edgeElement.previousElementSibling ?? edgeElement.parentElement?.previousElementSibling ?? null;
	if (frame === null || !(sized instanceof HTMLElement)) {
		return null;
	}

	return {
		edge,
		frame,
		sized,
		draggedWidthTargets: [sized, ...sized.querySelectorAll<HTMLElement>(SIDE_PANEL)],
		mostPx: px + sparePxOf(frame, edge, plateLeastPx),
		hasMoved: false,
	};
}

function sparePxOf(frame: HTMLElement, edge: FrameEdge, plateLeastPx: number): number {
	return [...frame.querySelectorAll(GIVING_PLATES[edge])].reduce(
		(spare, plate) => spare + Math.max(0, plate.getBoundingClientRect().width - plateLeastPx),
		0,
	);
}
