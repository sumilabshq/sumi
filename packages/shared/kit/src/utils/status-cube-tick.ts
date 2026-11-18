import { springToward } from "./spring";
import type { Point, Spring, Tension } from "./spring";

const TICK_MS = 1000;
const ROLL_SHARE = 0.6;
const EDGE_SHARE = 0.08;
const EYE_SHARE = 0.22;
const GIVE_SHARE = 0.07;
const EYE_DRAG = 0.6;
const SUBSTEPS = 4;
const QUARTER = Math.PI / 2;
const CORNER_GIVE: Tension = {
	stiff: 420,
	damp: 29.5,
};
const EYE_GIVE: Tension = {
	stiff: 520,
	damp: 26,
};
const CORNER_UNITS: readonly Point[] = [
	{
		x: -1,
		y: -1,
	},
	{
		x: 1,
		y: -1,
	},
	{
		x: 1,
		y: 1,
	},
	{
		x: -1,
		y: 1,
	},
];
const STILL: Point = {
	x: 0,
	y: 0,
};

export interface CubeGeometry {
	readonly viewBox: string;
	readonly edge: number;
	readonly eyeSide: number;
}

export interface CubeLook {
	readonly body: string;
	readonly eye: string;
}

export interface CubeMotion {
	atMs: number;
	past: readonly Point[] | null;
	pastBefore: readonly Point[] | null;
	readonly give: Spring[];
	readonly eye: Spring;
}

interface CubePose {
	readonly corners: readonly Point[];
	readonly centre: Point;
	readonly turn: number;
}

export function cubeGeometryOf(size: number): CubeGeometry {
	const edge = size * EDGE_SHARE;
	return {
		viewBox: `${-size / 2} ${-(size - edge / 2)} ${size} ${size}`,
		edge,
		eyeSide: (size - edge) * EYE_SHARE,
	};
}

export function freshCubeMotion(): CubeMotion {
	return {
		atMs: 0,
		past: null,
		pastBefore: null,
		give: CORNER_UNITS.map(stillSpring),
		eye: stillSpring(),
	};
}

export function restingCubeLook(size: number): CubeLook {
	return lookOf(poseAt(0, sideOf(size)), freshCubeMotion());
}

export function advanceCube(motion: CubeMotion, stepS: number, size: number): CubeLook {
	const side = sideOf(size);
	motion.atMs += stepS * 1000;
	const pose = poseAt(motion.atMs, side);
	const points = [...pose.corners, pose.centre];
	const pulls = pullsOf(points, motion, stepS);
	motion.pastBefore = motion.past;
	motion.past = points;
	const substep = stepS / SUBSTEPS;

	for (let at = 0; at < SUBSTEPS; at += 1) {
		motion.give.forEach((give, index) => {
			springToward(give, goalAgainst(pulls[index] ?? STILL, CORNER_GIVE, 1), CORNER_GIVE, substep);
			heldWithin(give, side * GIVE_SHARE);
		});
		springToward(motion.eye, goalAgainst(pulls[CORNER_UNITS.length] ?? STILL, EYE_GIVE, EYE_DRAG), EYE_GIVE, substep);
	}

	return lookOf(pose, motion);
}

function sideOf(size: number): number {
	return size * (1 - EDGE_SHARE);
}

function stillSpring(): Spring {
	return {
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
	};
}

function easeOf(share: number): number {
	return (1 - Math.cos(Math.PI * share)) / 2;
}

function turned(point: Point, angle: number): Point {
	const cos = Math.cos(angle);
	const sin = Math.sin(angle);
	return {
		x: point.x * cos + point.y * sin,
		y: -point.x * sin + point.y * cos,
	};
}

function poseAt(atMs: number, side: number): CubePose {
	const turns = Math.floor(atMs / TICK_MS);
	const turn = QUARTER * (turns + easeOf(Math.min(1, (atMs / TICK_MS - turns) / ROLL_SHARE)));
	const centre = {
		x: 0,
		y: side / 2,
	};
	const corners = CORNER_UNITS.map((unit) => {
		const corner = turned({ x: (unit.x * side) / 2, y: (unit.y * side) / 2 }, turn);
		return {
			x: centre.x + corner.x,
			y: centre.y + corner.y,
		};
	});
	return {
		corners,
		centre,
		turn,
	};
}

function pullsOf(points: readonly Point[], motion: CubeMotion, stepS: number): readonly Point[] {
	const { past, pastBefore } = motion;

	if (past === null || pastBefore === null || stepS <= 0) {
		return points.map(() => STILL);
	}

	const squared = stepS * stepS;
	return points.map((point, index) => {
		const was = past[index] ?? point;
		const before = pastBefore[index] ?? was;
		return {
			x: (point.x - 2 * was.x + before.x) / squared,
			y: (point.y - 2 * was.y + before.y) / squared,
		};
	});
}

function goalAgainst(pull: Point, tension: Tension, drag: number): Point {
	return {
		x: (-pull.x * drag) / tension.stiff,
		y: (-pull.y * drag) / tension.stiff,
	};
}

function heldWithin(give: Spring, most: number): void {
	const reach = Math.hypot(give.x, give.y);

	if (reach <= most) {
		return;
	}

	give.x *= most / reach;
	give.y *= most / reach;
}

function lookOf(pose: CubePose, motion: CubeMotion): CubeLook {
	const camera = pose.centre.x;
	const body = pose.corners
		.map((corner, index) => {
			const give = motion.give[index] ?? STILL;
			return `${(corner.x + give.x - camera).toFixed(2)},${(-(corner.y + give.y)).toFixed(2)}`;
		})
		.join(" ");
	const eyeX = (pose.centre.x + motion.eye.x - camera).toFixed(2);
	const eyeY = (-(pose.centre.y + motion.eye.y)).toFixed(2);
	return {
		body,
		eye: `translate(${eyeX} ${eyeY}) rotate(${((pose.turn * 180) / Math.PI).toFixed(1)})`,
	};
}
