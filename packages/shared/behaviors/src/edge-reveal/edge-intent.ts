export type EdgeSide = "left" | "right";

export const EDGE_SIDES: readonly EdgeSide[] = ["left", "right"];

export interface EdgePoint {
	readonly x: number;
	readonly y: number;
	readonly widthPx: number;
	readonly heightPx: number;
	readonly isButtonHeld: boolean;
}

interface Push {
	readonly x: number;
	readonly y: number;
}

const STRIP_PX = 8;
const CROSSED_PX = 10;
const STILL: Push = {
	x: 0,
	y: 0,
};

export class EdgeIntent {
	private last: EdgePoint | null = null;
	private lastPush: Push = STILL;

	sideOnMove(point: EdgePoint): EdgeSide | null {
		this.lastPush = this.pushTo(point);
		this.last = point;

		if (point.isButtonHeld) {
			return null;
		}

		return sideWithin(point.x, point.widthPx, STRIP_PX);
	}

	sideOnWindowLeave(point: EdgePoint): EdgeSide | null {
		const exit = exitOf(point, this.pushOnLeave(point));
		this.last = null;
		this.lastPush = STILL;

		if (point.isButtonHeld || isNearTopOrBottom(exit)) {
			return null;
		}

		return sideWithin(exit.x, exit.widthPx, CROSSED_PX);
	}

	private pushTo(point: EdgePoint): Push {
		if (this.last === null) {
			return STILL;
		}

		return {
			x: point.x - this.last.x,
			y: point.y - this.last.y,
		};
	}

	private pushOnLeave(point: EdgePoint): Push {
		const push = this.pushTo(point);
		return push.x === 0 && push.y === 0 ? this.lastPush : push;
	}
}

export function isNearCorner(y: number, heightPx: number): boolean {
	return y <= CROSSED_PX || y >= heightPx - CROSSED_PX;
}

function exitOf(point: EdgePoint, push: Push): EdgePoint {
	return {
		...point,
		x: clamp(point.x + push.x, point.widthPx),
		y: clamp(point.y + push.y, point.heightPx),
	};
}

function clamp(value: number, mostPx: number): number {
	return Math.max(0, Math.min(value, mostPx));
}

function isNearTopOrBottom({ y, heightPx }: EdgePoint): boolean {
	return isNearCorner(y, heightPx);
}

function sideWithin(x: number, widthPx: number, reachPx: number): EdgeSide | null {
	if (x <= reachPx) {
		return "left";
	}

	if (x >= widthPx - reachPx) {
		return "right";
	}

	return null;
}
