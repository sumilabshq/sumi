export type EdgeSide = "left" | "right";

export interface EdgeMove {
	readonly t: number;
	readonly x: number;
	readonly y: number;
	readonly pushX: number;
	readonly pushY: number;
	readonly widthPx: number;
	readonly isButtonHeld: boolean;
	readonly flushSides: Readonly<Record<EdgeSide, boolean>>;
}

interface EdgeTiming {
	readonly stripPx: number;
	readonly flushDwellMs: number;
	readonly floatingDwellMs: number;
	readonly stillPx: number;
	readonly slidePx: number;
	readonly quietMs: number;
}

const EDGE_TIMING: EdgeTiming = {
	stripPx: 8,
	flushDwellMs: 0,
	floatingDwellMs: 40,
	stillPx: 1,
	slidePx: 2,
	quietMs: 600,
};

interface Armed {
	readonly side: EdgeSide;
	readonly isFlush: boolean;
	readonly stillSince: number;
	readonly x: number;
	readonly y: number;
}

export class EdgeIntent {
	private armed: Armed | null = null;
	private lastMove: EdgeMove | null = null;
	private quietUntil = 0;

	readMove(move: EdgeMove): void {
		this.lastMove = move;
		const side = this.sideAt(move.x, move.widthPx);
		const armed = this.armed?.side === side ? this.armed : null;

		if (side === null || this.isIgnored(move, side, armed !== null)) {
			this.armed = null;
			return;
		}

		this.armed = armedAfter(armed, side, move);
	}

	dueAt(): number | null {
		if (this.armed === null) {
			return null;
		}

		return this.dueOf(this.armed);
	}

	takeDueSide(t: number): EdgeSide | null {
		const armed = this.armed;

		if (armed === null || t < this.dueOf(armed)) {
			return null;
		}

		this.armed = null;
		return armed.side;
	}

	sideOnWindowLeave(leave: EdgeMove): EdgeSide | null {
		const move = this.withLastPush(leave);
		this.armed = null;
		this.lastMove = null;
		const side = this.sideAt(move.x + move.pushX, move.widthPx);

		if (side === null || this.isIgnored(move, side, false)) {
			return null;
		}

		return side;
	}

	startQuietPeriod(t: number): void {
		this.armed = null;
		this.quietUntil = t + EDGE_TIMING.quietMs;
	}

	private withLastPush(leave: EdgeMove): EdgeMove {
		const last = this.lastMove;

		if (last === null || leave.pushX !== 0 || leave.pushY !== 0) {
			return leave;
		}

		return {
			...leave,
			pushX: last.pushX,
			pushY: last.pushY,
		};
	}

	private isIgnored(move: EdgeMove, side: EdgeSide, isArmed: boolean): boolean {
		return (
			move.isButtonHeld || move.t < this.quietUntil || isSliding(move) || (!isArmed && !isOutward(side, move.pushX))
		);
	}

	private sideAt(x: number, widthPx: number): EdgeSide | null {
		if (x <= EDGE_TIMING.stripPx) {
			return "left";
		}

		if (x >= widthPx - EDGE_TIMING.stripPx) {
			return "right";
		}

		return null;
	}

	private dueOf(armed: Armed): number {
		return armed.stillSince + (armed.isFlush ? EDGE_TIMING.flushDwellMs : EDGE_TIMING.floatingDwellMs);
	}
}

function armedAfter(armed: Armed | null, side: EdgeSide, move: EdgeMove): Armed {
	const isStill = armed !== null && Math.hypot(move.x - armed.x, move.y - armed.y) <= EDGE_TIMING.stillPx;
	return {
		side,
		isFlush: move.flushSides[side],
		stillSince: isStill ? armed.stillSince : move.t,
		x: move.x,
		y: move.y,
	};
}

function isOutward(side: EdgeSide, pushX: number): boolean {
	return side === "left" ? pushX < 0 : pushX > 0;
}

function isSliding({ pushX, pushY }: EdgeMove): boolean {
	return Math.abs(pushY) > EDGE_TIMING.slidePx && Math.abs(pushY) > Math.abs(pushX);
}
