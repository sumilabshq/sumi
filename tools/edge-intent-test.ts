import { EdgeIntent } from "../packages/behaviors/src/edge-reveal/edge-intent.ts";
import type { EdgeMove, EdgeSide } from "../packages/behaviors/src/edge-reveal/edge-intent.ts";
import { check, tally } from "./check-helpers.ts";

interface Step {
	readonly t: number;
	readonly x: number;
	readonly y?: number;
	readonly pushX?: number;
	readonly pushY?: number;
	readonly held?: boolean;
	readonly leaves?: true;
}

interface Revealed {
	readonly side: EdgeSide;
	readonly t: number;
}

const WIDTH = 1440;
const FLUSH = {
	left: true,
	right: true,
};
const FLOATING = {
	left: false,
	right: false,
};

function replay(
	steps: readonly Step[],
	flushSides: EdgeMove["flushSides"],
	intent = new EdgeIntent(),
): Revealed | null {
	for (const step of steps) {
		const settled = settleBefore(intent, step.t);

		if (settled !== null) {
			return settled;
		}

		const move = moveOf(step, flushSides);

		if (step.leaves === true) {
			const side = intent.sideOnWindowLeave(move);
			return side === null ? null : { side, t: step.t };
		}

		intent.readMove(move);
	}

	return settleBefore(intent, Number.POSITIVE_INFINITY);
}

function moveOf(step: Step, flushSides: EdgeMove["flushSides"]): EdgeMove {
	return {
		t: step.t,
		x: step.x,
		y: step.y ?? 400,
		pushX: step.pushX ?? 0,
		pushY: step.pushY ?? 0,
		widthPx: WIDTH,
		isButtonHeld: step.held ?? false,
		flushSides,
	};
}

function settleBefore(intent: EdgeIntent, t: number): Revealed | null {
	const due = intent.dueAt();

	if (due === null || due > t) {
		return null;
	}

	const side = intent.takeDueSide(due);
	return side === null ? null : { side, t: due };
}

const FLICK_LEFT: readonly Step[] = [
	{ t: 0, x: 300 },
	{ t: 16, x: 120, pushX: -180 },
	{ t: 32, x: 20, pushX: -100 },
	{ t: 48, x: 0, pushX: -20 },
];

check("a flick into the screen's left edge opens the moment it lands", replay(FLICK_LEFT, FLUSH), {
	side: "left",
	t: 48,
});

check(
	"a pointer that stops a few pixels short of the screen's edge opens too",
	replay(
		[
			{ t: 0, x: 300 },
			{ t: 16, x: 5, pushX: -295 },
		],
		FLUSH,
	),
	{ side: "left", t: 16 },
);

check(
	"crossing a floating window's left edge opens the left side",
	replay(
		[
			{ t: 0, x: 200 },
			{ t: 16, x: 60, pushX: -140 },
			{ t: 24, x: 60, leaves: true },
		],
		FLOATING,
	),
	{ side: "left", t: 24 },
);

check(
	"crossing a floating window's right edge opens the right side",
	replay(
		[
			{ t: 0, x: 1200 },
			{ t: 16, x: 1420, pushX: 220 },
			{ t: 24, x: 1445, pushX: 25, leaves: true },
		],
		FLOATING,
	),
	{ side: "right", t: 24 },
);

check(
	"leaving through the top of the window opens nothing",
	replay(
		[
			{ t: 0, x: 4, y: 200 },
			{ t: 16, x: 3, y: 40, pushX: -1, pushY: -160 },
			{ t: 24, x: 3, y: -2, pushY: -42, leaves: true },
		],
		FLOATING,
	),
	null,
);

check(
	"leaving far from a side opens nothing",
	replay(
		[
			{ t: 0, x: 700, y: 100 },
			{ t: 16, x: 690, y: 0, pushX: -10, pushY: -100, leaves: true },
		],
		FLOATING,
	),
	null,
);

check(
	"stopping at a floating window's left edge opens after the short dwell",
	replay(
		[
			{ t: 0, x: 200 },
			{ t: 16, x: 60, pushX: -140 },
			{ t: 32, x: 4, pushX: -56 },
		],
		FLOATING,
	),
	{ side: "left", t: 72 },
);

check(
	"coming back from the app on the left through the edge opens nothing",
	replay(
		[
			{ t: 0, x: 2, pushX: 30 },
			{ t: 16, x: 40, pushX: 38 },
		],
		FLOATING,
	),
	null,
);

check("stopping right after coming back in opens nothing", replay([{ t: 0, x: 3, pushX: 30 }], FLOATING), null);

check(
	"a pointer that came back in and jitters with no sideways push opens nothing",
	replay(
		[
			{ t: 0, x: 2, pushX: 30 },
			{ t: 16, x: 2, pushY: 1 },
			{ t: 32, x: 2 },
			{ t: 48, x: 2, pushY: -1 },
			{ t: 300, x: 2 },
		],
		FLOATING,
	),
	null,
);

check(
	"sliding down along the edge opens nothing",
	replay(
		[
			{ t: 0, x: 3, y: 100, pushX: -1, pushY: 1 },
			{ t: 16, x: 3, y: 130, pushY: 30 },
			{ t: 32, x: 3, y: 160, pushY: 30 },
			{ t: 48, x: 3, y: 190, pushY: 30 },
		],
		FLOATING,
	),
	null,
);

check(
	"a held button at the edge (selecting, dragging) opens nothing",
	replay([{ t: 0, x: 0, pushX: -40, held: true }], FLUSH),
	null,
);

check(
	"leaving the window with a held button opens nothing",
	replay([{ t: 0, x: 3, pushX: -40, held: true, leaves: true }], FLOATING),
	null,
);

check(
	"a website's own control just inside the edge stays reachable",
	replay(
		[
			{ t: 0, x: 200 },
			{ t: 16, x: 20, pushX: -180 },
		],
		FLUSH,
	),
	null,
);

check(
	"a drifting pointer in the strip of a floating window opens once it holds still",
	replay(
		[
			{ t: 0, x: 6, pushX: -10 },
			{ t: 20, x: 4, pushX: -2 },
			{ t: 200, x: 2, pushX: -2 },
		],
		FLOATING,
	),
	{ side: "left", t: 60 },
);

check(
	"a flick into the screen's right edge opens the right side",
	replay(
		[
			{ t: 0, x: 1200 },
			{ t: 16, x: 1439, pushX: 239 },
		],
		FLUSH,
	),
	{ side: "right", t: 16 },
);

const quiet = new EdgeIntent();
quiet.startQuietPeriod(0);
check("right after a close the edge stays quiet", replay([{ t: 100, x: 0, pushX: -40 }], FLUSH, quiet), null);
check(
	"right after a close leaving through the edge stays quiet",
	replay([{ t: 100, x: 0, pushX: -40, leaves: true }], FLOATING, quiet),
	null,
);
check("after the quiet time the edge answers again", replay([{ t: 700, x: 0, pushX: -40 }], FLUSH, quiet), {
	side: "left",
	t: 700,
});

if (tally.failed > 0) {
	console.error(`${tally.failed} edge intent check(s) failed`);
	process.exit(1);
}
