import type { Point } from "./sumi-springs.js";
import type { SumiState } from "./sumi-state.js";

const CENTRE: Point = {
	x: 0,
	y: 0,
};

const CLOSED_LID = 0.14;
const BLINK_EVERY_MS = 3800;
const BLINK_MS = 150;
const TAP_MS = 420;
const NOD_MS = 150;
const NODS = 4;
const SHAKE_MS = 90;
const SHAKES = 6;

export function gazeGoalOf(state: SumiState, sinceMs: number, gaze: Point): Point {
	if (state === "rest") {
		return gaze;
	}

	if (state === "listening") {
		return {
			x: gaze.x * 0.5,
			y: 0.6,
		};
	}

	if (state === "waits") {
		return {
			x: 0,
			y: Math.floor(sinceMs / TAP_MS) % 2 === 0 ? 0.8 : 0.58,
		};
	}

	if (state === "asleep") {
		return {
			x: 0,
			y: 0.78,
		};
	}

	return movedGoalOf(state, sinceMs);
}

export function lidOf(state: SumiState, sinceMs: number): number {
	if (state === "asleep") {
		return CLOSED_LID;
	}

	if (state !== "rest" && state !== "listening" && state !== "waits") {
		return 1;
	}

	const phase = sinceMs % BLINK_EVERY_MS;
	return phase < BLINK_MS ? 1 - (1 - CLOSED_LID) * Math.sin((phase / BLINK_MS) * Math.PI) : 1;
}

export function stillGoalOf(state: SumiState): Point {
	return gazeGoalOf(state, NOD_MS * NODS + SHAKE_MS * SHAKES, CENTRE);
}

function movedGoalOf(state: SumiState, sinceMs: number): Point {
	if (state === "done") {
		const nod = Math.floor(sinceMs / NOD_MS);
		return nod >= NODS ? CENTRE : { x: 0, y: nod % 2 === 0 ? -0.7 : 0.35 };
	}

	if (state === "error") {
		const shake = Math.floor(sinceMs / SHAKE_MS);
		return shake >= SHAKES ? CENTRE : { x: shake % 2 === 0 ? -0.6 : 0.6, y: 0 };
	}

	return CENTRE;
}
