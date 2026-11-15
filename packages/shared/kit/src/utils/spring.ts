export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface Spring {
	x: number;
	y: number;
	vx: number;
	vy: number;
}

export interface Tension {
	readonly stiff: number;
	readonly damp: number;
}

export const CORNER_TENSION: Tension = {
	stiff: 170,
	damp: 18,
};

const SETTLED_PX = 0.3;
const LONGEST_STEP_S = 0.032;

export function restingSpring(): Spring {
	return {
		x: 0,
		y: 0,
		vx: 0,
		vy: 0,
	};
}

export function springToward(spring: Spring, goal: Point, { stiff, damp }: Tension, dt: number): void {
	spring.vx += ((goal.x - spring.x) * stiff - spring.vx * damp) * dt;
	spring.vy += ((goal.y - spring.y) * stiff - spring.vy * damp) * dt;
	spring.x += spring.vx * dt;
	spring.y += spring.vy * dt;
}

export function isSettled(spring: Spring, goal: Point): boolean {
	return (
		Math.abs(goal.x - spring.x) < SETTLED_PX &&
		Math.abs(goal.y - spring.y) < SETTLED_PX &&
		Math.abs(spring.vx) < SETTLED_PX &&
		Math.abs(spring.vy) < SETTLED_PX
	);
}

export function frameStepOf(now: number, last: number): number {
	return Math.min(LONGEST_STEP_S, (now - last) / 1000);
}
