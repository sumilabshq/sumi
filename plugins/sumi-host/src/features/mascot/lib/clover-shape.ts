export interface Point {
	readonly x: number;
	readonly y: number;
}

interface Capsule {
	readonly from: Point;
	readonly to: Point;
	readonly fromRadius: number;
	readonly toRadius: number;
}

interface Leaf {
	readonly degrees: number;
	readonly scale: number;
}

export const STEM_FOOT: Point = {
	x: -0.05,
	y: 0.86,
};

const HEART: Point = {
	x: 0,
	y: -0.12,
};
const STEM_KNEE: Point = {
	x: 0.04,
	y: 0.33,
};
const LEAVES: readonly Leaf[] = [
	{
		degrees: -52,
		scale: 1,
	},
	{
		degrees: 38,
		scale: 0.86,
	},
	{
		degrees: 131,
		scale: 0.94,
	},
	{
		degrees: 222,
		scale: 0.78,
	},
];
const STEM: readonly Capsule[] = [
	{
		from: HEART,
		to: STEM_KNEE,
		fromRadius: 0.035,
		toRadius: 0.04,
	},
	{
		from: STEM_KNEE,
		to: STEM_FOOT,
		fromRadius: 0.04,
		toRadius: 0.048,
	},
];
const LOBE_SPREADS_DEG = [-19, 19];
const LEAF_REACH = 0.52;
const LOBE_RADIUS = 0.2;
const NECK_RADIUS = 0.035;
const BREATH = 0.03;
const SWAY_DEG = 2.5;
const MELT = 0.05;
const EDGE_DEPTH = 0.14;
const SLOPE_STEP = 0.02;
const FAINTEST_INK = 0.02;
const LIT_EDGE_INK = 0.25;
const SHADED_EDGE_INK = 0.85;
const FAR = 9;

export function cloverCapsulesAt(seconds: number): readonly Capsule[] {
	return [...LEAVES.flatMap((leaf, at) => lobesOf(leaf, at, seconds)), ...STEM];
}

export function cloverInkAt(capsules: readonly Capsule[], at: Point, light: Point): number {
	const distance = distanceAt(capsules, at);

	if (distance > 0) {
		return -distance;
	}

	const depth = Math.min(1, -distance / EDGE_DEPTH);
	const slopeX = distanceAt(capsules, { x: at.x + SLOPE_STEP, y: at.y }) - distance;
	const slopeY = distanceAt(capsules, { x: at.x, y: at.y + SLOPE_STEP }) - distance;
	const steep = Math.hypot(slopeX, slopeY) || 1;
	const lit = Math.max(0, Math.min(1, 0.5 + (0.5 * (slopeX * light.x + slopeY * light.y)) / steep));
	const edgeInk = SHADED_EDGE_INK - (SHADED_EDGE_INK - LIT_EDGE_INK) * lit;
	return Math.max(FAINTEST_INK, depth + (1 - depth) * edgeInk);
}

export function leanedPoint(at: Point, tilt: number): Point {
	const acrossX = at.x - STEM_FOOT.x;
	const acrossY = at.y - STEM_FOOT.y;
	return {
		x: STEM_FOOT.x + acrossX * Math.cos(tilt) + acrossY * Math.sin(tilt),
		y: STEM_FOOT.y - acrossX * Math.sin(tilt) + acrossY * Math.cos(tilt),
	};
}

function lobesOf(leaf: Leaf, at: number, seconds: number): Capsule[] {
	const scale = leaf.scale * (1 + BREATH * Math.sin(seconds * 1.1 + at * 1.9));
	const degrees = leaf.degrees + SWAY_DEG * Math.sin(seconds * 0.7 + at);
	return LOBE_SPREADS_DEG.map((spread) => {
		const turn = ((degrees + spread) * Math.PI) / 180;
		return {
			from: HEART,
			to: {
				x: HEART.x + Math.sin(turn) * LEAF_REACH * scale,
				y: HEART.y - Math.cos(turn) * LEAF_REACH * scale,
			},
			fromRadius: NECK_RADIUS,
			toRadius: LOBE_RADIUS * scale,
		};
	});
}

function distanceAt(capsules: readonly Capsule[], at: Point): number {
	return capsules.reduce((nearest, capsule) => meltedMin(nearest, capsuleDistance(capsule, at)), FAR);
}

function capsuleDistance(capsule: Capsule, at: Point): number {
	const alongX = capsule.to.x - capsule.from.x;
	const alongY = capsule.to.y - capsule.from.y;
	const reached =
		((at.x - capsule.from.x) * alongX + (at.y - capsule.from.y) * alongY) / (alongX * alongX + alongY * alongY);
	const share = Math.max(0, Math.min(1, reached));
	const radius = capsule.fromRadius + (capsule.toRadius - capsule.fromRadius) * share;
	return Math.hypot(at.x - capsule.from.x - alongX * share, at.y - capsule.from.y - alongY * share) - radius;
}

function meltedMin(first: number, second: number): number {
	const blend = Math.max(MELT - Math.abs(first - second), 0) / MELT;
	return Math.min(first, second) - (blend * blend * MELT) / 4;
}
