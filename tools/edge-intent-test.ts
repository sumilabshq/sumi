import { EdgeIntent } from "../packages/behaviors/src/edge-reveal/edge-intent.ts";
import type { EdgePoint, EdgeSide } from "../packages/behaviors/src/edge-reveal/edge-intent.ts";
import { check, tally } from "./check-helpers.ts";

interface Step {
	readonly x: number;
	readonly y?: number;
	readonly isButtonHeld?: boolean;
	readonly leavesWindow?: true;
}

const WINDOW_WIDTH_PX = 1440;
const WINDOW_HEIGHT_PX = 900;

function firstRevealOf(steps: readonly Step[]): EdgeSide | null {
	const intent = new EdgeIntent();

	for (const step of steps) {
		const point = pointOf(step);
		const side = step.leavesWindow === true ? intent.sideOnWindowLeave(point) : intent.sideOnMove(point);

		if (side !== null) {
			return side;
		}
	}

	return null;
}

function pointOf(step: Step): EdgePoint {
	return {
		x: step.x,
		y: step.y ?? 400,
		widthPx: WINDOW_WIDTH_PX,
		heightPx: WINDOW_HEIGHT_PX,
		isButtonHeld: step.isButtonHeld ?? false,
	};
}

check("resting on the left edge opens the left side at once", firstRevealOf([{ x: 300 }, { x: 0 }]), "left");
check("stopping a few pixels short of the left edge opens it too", firstRevealOf([{ x: 300 }, { x: 6 }]), "left");
check("resting on the right edge opens the right side", firstRevealOf([{ x: 1200 }, { x: 1439 }]), "right");
check("coming in from beyond the edge opens it, as in Zen", firstRevealOf([{ x: 2 }]), "left");
check("a control just inside the edge stays reachable", firstRevealOf([{ x: 300 }, { x: 20 }]), null);
check(
	"a held button at the edge (selecting, dragging) opens nothing",
	firstRevealOf([{ x: 300 }, { x: 0, isButtonHeld: true }]),
	null,
);
check(
	"a fast flick that leaves the window far from the edge still opens the side it crossed",
	firstRevealOf([{ x: 300 }, { x: 60 }, { x: 60, leavesWindow: true }]),
	"left",
);
check(
	"leaving through the right edge opens the right side",
	firstRevealOf([{ x: 1300 }, { x: 1420 }, { x: 1445, leavesWindow: true }]),
	"right",
);
check(
	"leaving within 10px of the edge opens the side even with no motion data",
	firstRevealOf([{ x: 9, leavesWindow: true }]),
	"left",
);
check(
	"leaving through the top opens nothing",
	firstRevealOf([
		{ x: 400, y: 120 },
		{ x: 398, y: 30 },
		{ x: 397, y: -4, leavesWindow: true },
	]),
	null,
);
check(
	"leaving through the top-left corner counts as the top",
	firstRevealOf([
		{ x: 60, y: 60 },
		{ x: 30, y: 20 },
		{ x: 15, y: -2, leavesWindow: true },
	]),
	null,
);
check(
	"leaving with a held button opens nothing",
	firstRevealOf([{ x: 300 }, { x: 60 }, { x: 40, isButtonHeld: true, leavesWindow: true }]),
	null,
);
check(
	"leaving slowly far from both sides opens nothing",
	firstRevealOf([
		{ x: 700, y: 30 },
		{ x: 700, y: 5 },
		{ x: 700, y: -1, leavesWindow: true },
	]),
	null,
);

if (tally.failed > 0) {
	console.error(`${tally.failed} edge intent check(s) failed`);
	process.exit(1);
}
