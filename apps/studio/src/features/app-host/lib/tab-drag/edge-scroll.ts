import { rectOf } from "./sidebar-layout.js";
import type { Rect } from "./sidebar-layout.js";

const EDGE_PX = 40;
const FASTEST_PX_PER_FRAME = 14;

export class EdgeScroll {
	private speed = 0;
	private frame = 0;

	constructor(private readonly scroller: HTMLElement | null) {}

	aim(x: number, y: number): void {
		this.speed = this.scroller === null ? 0 : speedAt(rectOf(this.scroller), x, y);

		if (this.speed === 0 || this.frame !== 0) {
			return;
		}

		this.frame = requestAnimationFrame(this.step);
	}

	stop(): void {
		this.speed = 0;
		cancelAnimationFrame(this.frame);
		this.frame = 0;
	}

	private readonly step = (): void => {
		this.frame = 0;

		if (this.scroller === null || this.speed === 0) {
			return;
		}

		this.scroller.scrollTop += this.speed;
		this.frame = requestAnimationFrame(this.step);
	};
}

function speedAt(box: Rect, x: number, y: number): number {
	const right = box.left + box.width;
	const bottom = box.top + box.height;

	if (x < box.left || x > right || y < box.top || y > bottom) {
		return 0;
	}

	const fromTop = y - box.top;
	const fromBottom = bottom - y;

	if (fromTop < EDGE_PX) {
		return -FASTEST_PX_PER_FRAME * depthOf(fromTop);
	}

	return fromBottom < EDGE_PX ? FASTEST_PX_PER_FRAME * depthOf(fromBottom) : 0;
}

function depthOf(distance: number): number {
	return Math.min(1, Math.max(0.15, 1 - distance / EDGE_PX));
}
