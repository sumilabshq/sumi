import { restingSpring } from "@widgetarium/kit";
import type { Point, Spring, Tension } from "@widgetarium/kit";

export { CORNER_TENSION, restingSpring, springToward } from "@widgetarium/kit";
export type { Point, Spring, Tension } from "@widgetarium/kit";

export const EYE_TENSION: Tension = {
	stiff: 520,
	damp: 26,
};

export const EYE_OF_SIZE = 0.2;
export const BODY_PAD_OF_SIZE = 0.15;

const EYE_MARGIN_OF_SIZE = 0.16;
const STRETCH_PER_PX = 0.0016;
const MOST_STRETCH = 1.9;
const LEAN_OF_SIZE = 8 / 140;
const PULL_OF_SIZE = 11 / 140;
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

export function restingCorners(): Spring[] {
	return CORNER_UNITS.map(() => restingSpring());
}

export function eyeTravelOf(size: number): number {
	return size * (0.5 - EYE_OF_SIZE / 2 - EYE_MARGIN_OF_SIZE);
}

export function eyeTransformOf(eye: Spring, size: number, lid: number): string {
	const travel = eyeTravelOf(size);
	const perScale = 200 / size;
	const stretchX = 1 + Math.min(MOST_STRETCH - 1, Math.abs(eye.vx * travel) * perScale * STRETCH_PER_PX);
	const stretchY = 1 + Math.min(MOST_STRETCH - 1, Math.abs(eye.vy * travel) * perScale * STRETCH_PER_PX);
	const scaleX = stretchX / Math.sqrt(stretchY);
	const scaleY = (stretchY / Math.sqrt(stretchX)) * lid;
	return `translate(${(eye.x * travel).toFixed(2)} ${(eye.y * travel).toFixed(2)}) scale(${scaleX.toFixed(3)} ${scaleY.toFixed(3)})`;
}

export function cornerGoalsOf(toward: Point, near: number, move: Point, push: number, size: number): Point[] {
	return CORNER_UNITS.map((corner) => {
		const lean = facingOf(corner, toward) * near * LEAN_OF_SIZE * size;
		const pull = facingOf(corner, move) * push * PULL_OF_SIZE * size;
		return {
			x: toward.x * lean + move.x * pull,
			y: toward.y * lean + move.y * pull,
		};
	});
}

export function bodyPointsOf(corners: readonly Spring[], size: number): string {
	const half = size / 2;
	return CORNER_UNITS.map((unit, at) => {
		const spring = corners[at] ?? restingSpring();
		return `${(unit.x * half + spring.x).toFixed(1)},${(unit.y * half + spring.y).toFixed(1)}`;
	}).join(" ");
}

function facingOf(corner: Point, direction: Point): number {
	return Math.max(0, (corner.x * direction.x + corner.y * direction.y) / Math.SQRT2);
}
