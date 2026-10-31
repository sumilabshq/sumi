import { seenPlacedAs } from "./layout-sight.js";
import type { Seen, Sight } from "./layout-sight.js";

const GROWN = "[data-tabs-box], [data-tabs-split], [data-tabs-card]";
const EASE = "cubic-bezier(0.33, 0.33, 0.5, 1)";
const SHORTEST_MS = 250;
const ROW_LONGEST_MS = 1000;
const ROW_MS_PER_PX = 3.8;
const TILE_LONGEST_MS = 450;
const TILE_MS_PER_PX = 1.8;
const TILE = "[data-tabs-item=essential]";
const LIFTED = "[data-tabs-lifted]";
const POP_FROM = 0.85;
const POP_SCALE = 0.8;
const STILL_PX = 0.5;
const CALM = "(prefers-reduced-motion: reduce)";
const POPPED_IN: Keyframe[] = [
	{
		opacity: 0,
		transform: `scale(${POP_SCALE})`,
	},
	{
		opacity: 0,
		transform: `scale(${POP_SCALE})`,
		offset: POP_FROM,
	},
	{
		opacity: 1,
		transform: "none",
	},
];

interface Move {
	readonly element: HTMLElement;
	readonly dx: number;
	readonly dy: number;
	readonly grown: number;
}

interface GlideTiming {
	readonly msOf: (move: Move) => number;
	readonly longestMs: number;
}

export class LayoutMotion {
	private running: readonly Animation[] = [];
	private movingUntil = 0;

	isMoving(): boolean {
		return performance.now() < this.movingUntil;
	}

	msLeft(): number {
		return Math.max(0, this.movingUntil - performance.now());
	}

	stop(): void {
		this.running.forEach((animation) => animation.cancel());
		this.running = [];
		this.movingUntil = 0;
	}

	glide(before: Sight, after: Sight): void {
		if (window.matchMedia(CALM).matches) {
			return;
		}

		const moves = movesOf(before, after);
		const timing = glideTimingOf(moves);
		this.running = moves.flatMap((move) => animationsOf(move, timing.msOf(move)));
		this.movingUntil = moves.length === 0 ? 0 : performance.now() + timing.longestMs;
	}
}

function glideTimingOf(moves: readonly Move[]): GlideTiming {
	const rows = moves.filter((move) => !move.element.matches(`${TILE}, ${LIFTED}`));
	const tiles = moves.filter((move) => move.element.matches(TILE) && !move.element.matches(LIFTED));
	const rowMs = durationOf(rows, ROW_MS_PER_PX, ROW_LONGEST_MS);
	const tileMs = durationOf(tiles, TILE_MS_PER_PX, TILE_LONGEST_MS);
	return {
		msOf: (move) => msOfMove(move, rowMs, tileMs),
		longestMs: Math.max(SHORTEST_MS, rowMs, tileMs),
	};
}

function msOfMove(move: Move, rowMs: number, tileMs: number): number {
	if (move.element.matches(LIFTED)) {
		return SHORTEST_MS;
	}

	return move.element.matches(TILE) ? tileMs : rowMs;
}

function movesOf(before: Sight, after: Sight): readonly Move[] {
	const shifts = new Map<HTMLElement, readonly [number, number]>();
	return [...after].flatMap(([key, now]) => {
		const was = before.get(key) ?? seenPlacedAs(before, now.placed);

		if (was === undefined) {
			return [];
		}

		shifts.set(now.element, shiftOf(was, now));
		const own = ownMoveOf(was, now, shifts);
		return isMoved(own) ? [own] : [];
	});
}

function shiftOf(was: Seen, now: Seen): readonly [number, number] {
	return [was.left - now.left, was.top - now.top];
}

function ownMoveOf(was: Seen, now: Seen, shifts: ReadonlyMap<HTMLElement, readonly [number, number]>): Move {
	const [dx, dy] = shiftOf(was, now);
	const [aboveX, aboveY] = shiftAboveOf(now.element, shifts);
	return {
		element: now.element,
		dx: dx - aboveX,
		dy: dy - aboveY,
		grown: now.element.matches(GROWN) ? now.height - was.height : 0,
	};
}

function isMoved({ dx, dy, grown }: Move): boolean {
	return Math.abs(dx) >= STILL_PX || Math.abs(dy) >= STILL_PX || grown >= STILL_PX;
}

function shiftAboveOf(
	element: HTMLElement,
	shifts: ReadonlyMap<HTMLElement, readonly [number, number]>,
): readonly [number, number] {
	for (let above = element.parentElement; above !== null; above = above.parentElement) {
		const shift = shifts.get(above);

		if (shift !== undefined) {
			return shift;
		}
	}

	return [0, 0];
}

function durationOf(moves: readonly Move[], msPerPx: number, longestMs: number): number {
	const farthest = moves.reduce((most, move) => Math.max(most, Math.hypot(move.dx, move.dy), move.grown), 0);
	return Math.min(longestMs, Math.max(SHORTEST_MS, farthest * msPerPx));
}

function animationsOf(move: Move, duration: number): readonly Animation[] {
	const { element, dy } = move;

	if (typeof element.animate !== "function") {
		return [];
	}

	const timing = {
		duration,
		easing: EASE,
	};

	if (element.matches(TILE) && Math.abs(dy) >= STILL_PX) {
		return [element.animate(POPPED_IN, timing)];
	}

	return [...slidOf(move, timing), ...revealedOf(move, timing)];
}

function slidOf({ element, dx, dy }: Move, timing: KeyframeAnimationOptions): readonly Animation[] {
	if (Math.abs(dx) < STILL_PX && Math.abs(dy) < STILL_PX) {
		return [];
	}

	return [element.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }], timing)];
}

function revealedOf({ element, grown }: Move, timing: KeyframeAnimationOptions): readonly Animation[] {
	if (grown < STILL_PX) {
		return [];
	}

	return [element.animate([{ clipPath: `inset(0 0 ${grown}px 0)` }, { clipPath: "inset(0 0 0 0)" }], timing)];
}
