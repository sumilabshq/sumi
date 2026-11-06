import type { RefObject } from "react";
import type { EdgeSide } from "./edge-intent.js";
import type { ViewPoint } from "./edge-zones.js";
import { revealIfTucked } from "./edge-reveal-ask.js";
import type { EdgeRevealAsk } from "./edge-reveal-ask.js";

export const REST_MS = 80;
const REST_SLOP_PX = 4;

interface PendingRest {
	readonly side: EdgeSide;
	readonly at: ViewPoint;
	readonly timer: number;
}

export class RestReveal {
	private pending: PendingRest | null = null;

	constructor(private readonly latest: RefObject<EdgeRevealAsk>) {}

	watchRestAt(side: EdgeSide | null, at: ViewPoint): void {
		if (side === null || this.latest.current.sides[side] !== "tucked") {
			this.cancel();
			return;
		}

		if (this.pending !== null && this.pending.side === side && isStill(this.pending.at, at)) {
			return;
		}

		this.cancel();
		this.pending = {
			side,
			at,
			timer: window.setTimeout(() => this.revealRested(side), REST_MS),
		};
	}

	cancel(): void {
		if (this.pending === null) {
			return;
		}

		window.clearTimeout(this.pending.timer);
		this.pending = null;
	}

	private revealRested(side: EdgeSide): void {
		this.pending = null;
		revealIfTucked(this.latest.current, side);
	}
}

export function isStill(from: ViewPoint, to: ViewPoint): boolean {
	return Math.abs(to.x - from.x) <= REST_SLOP_PX && Math.abs(to.y - from.y) <= REST_SLOP_PX;
}
