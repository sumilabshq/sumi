import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { gazeGoalOf, lidOf } from "./sumi-goals.js";
import {
	CORNER_TENSION,
	EYE_TENSION,
	bodyPointsOf,
	cornerGoalsOf,
	eyeTransformOf,
	restingCorners,
	restingSpring,
	springToward,
} from "./sumi-springs.js";
import type { Point, Spring } from "./sumi-springs.js";
import type { SumiState } from "./sumi-state.js";

export const MOVING_FROM_PX = 24;

const SACCADE_MS = 70;
const GAZE_REACH_PX = 140;
const LEAN_REACH_PX = 520;
const FAST_PX_PER_S = 2200;
const LONGEST_FRAME_S = 0.032;

export interface SumiParts {
	readonly body: RefObject<SVGPolygonElement | null>;
	readonly eye: RefObject<SVGRectElement | null>;
}

interface Motion {
	readonly eye: Spring;
	readonly corners: Spring[];
	pointer: Point | null;
	previous: Point | null;
	velocity: Point;
	goal: Point;
	sinceMs: number;
	sinceSaccadeMs: number;
	lastAt: number | null;
}

interface Wanted {
	readonly state: SumiState;
	readonly changedAt: number;
}

export function useSumiMotion(state: SumiState, size: number): SumiParts {
	const body = useRef<SVGPolygonElement | null>(null);
	const eye = useRef<SVGRectElement | null>(null);
	const wanted = useRef<Wanted>({
		state,
		changedAt: performance.now(),
	});

	if (wanted.current.state !== state) {
		wanted.current = {
			state,
			changedAt: performance.now(),
		};
	}

	useEffect(() => {
		if (size < MOVING_FROM_PX || matchMedia("(prefers-reduced-motion: reduce)").matches) {
			return undefined;
		}

		return runsMotion(
			{
				body,
				eye,
			},
			wanted,
			size,
		);
	}, [size]);
	return {
		body,
		eye,
	};
}

function runsMotion(parts: SumiParts, wanted: RefObject<Wanted>, size: number): () => void {
	const motion = freshMotion();
	const heard = (event: PointerEvent): void => {
		motion.pointer = {
			x: event.clientX,
			y: event.clientY,
		};
	};
	let frame = requestAnimationFrame(function stepped(now) {
		advance(motion, parts, wanted.current, size, now);
		frame = requestAnimationFrame(stepped);
	});
	window.addEventListener("pointermove", heard, { passive: true });
	return () => {
		cancelAnimationFrame(frame);
		window.removeEventListener("pointermove", heard);
	};
}

function freshMotion(): Motion {
	return {
		eye: restingSpring(),
		corners: restingCorners(),
		pointer: null,
		previous: null,
		velocity: {
			x: 0,
			y: 0,
		},
		goal: {
			x: 0,
			y: 0,
		},
		sinceMs: 0,
		sinceSaccadeMs: 0,
		lastAt: null,
	};
}

function advance(motion: Motion, parts: SumiParts, wanted: Wanted, size: number, now: number): void {
	const dt = motion.lastAt === null ? 0.016 : Math.min(LONGEST_FRAME_S, (now - motion.lastAt) / 1000);
	motion.lastAt = now;
	motion.sinceMs = now - wanted.changedAt;
	motion.sinceSaccadeMs += dt * 1000;
	followPointer(motion, dt);
	const centre = centreOf(parts.body.current);

	if (motion.sinceSaccadeMs >= SACCADE_MS) {
		motion.goal = gazeGoalOf(wanted.state, motion.sinceMs, gazeOf(motion.pointer, centre));
		motion.sinceSaccadeMs = 0;
	}

	springToward(motion.eye, motion.goal, EYE_TENSION, dt);
	bendsBody(motion, centre, size, dt);
	parts.eye.current?.setAttribute("transform", eyeTransformOf(motion.eye, size, lidOf(wanted.state, motion.sinceMs)));
	parts.body.current?.setAttribute("points", bodyPointsOf(motion.corners, size));
}

function followPointer(motion: Motion, dt: number): void {
	const moved =
		motion.pointer !== null && motion.previous !== null
			? {
					x: (motion.pointer.x - motion.previous.x) / dt,
					y: (motion.pointer.y - motion.previous.y) / dt,
				}
			: {
					x: 0,
					y: 0,
				};
	motion.velocity = {
		x: motion.velocity.x * 0.75 + moved.x * 0.25,
		y: motion.velocity.y * 0.75 + moved.y * 0.25,
	};
	motion.previous = motion.pointer;
}

function bendsBody(motion: Motion, centre: Point | null, size: number, dt: number): void {
	const speed = Math.hypot(motion.velocity.x, motion.velocity.y);
	const move = speed > 1 ? { x: motion.velocity.x / speed, y: motion.velocity.y / speed } : { x: 0, y: 0 };
	const toward = towardOf(motion.pointer, centre);
	const goals = cornerGoalsOf(toward.direction, toward.near, move, Math.min(1, speed / FAST_PX_PER_S), size);
	motion.corners.forEach((corner, at) => {
		springToward(corner, goals[at] ?? { x: 0, y: 0 }, CORNER_TENSION, dt);
	});
}

function centreOf(element: Element | null): Point | null {
	if (element === null) {
		return null;
	}

	const box = element.getBoundingClientRect();
	return {
		x: box.left + box.width / 2,
		y: box.top + box.height / 2,
	};
}

function gazeOf(pointer: Point | null, centre: Point | null): Point {
	if (pointer === null || centre === null) {
		return {
			x: 0,
			y: 0,
		};
	}

	return {
		x: Math.max(-1, Math.min(1, (pointer.x - centre.x) / GAZE_REACH_PX)),
		y: Math.max(-1, Math.min(1, (pointer.y - centre.y) / GAZE_REACH_PX)),
	};
}

function towardOf(pointer: Point | null, centre: Point | null): { readonly direction: Point; readonly near: number } {
	const far = pointer === null || centre === null ? 0 : Math.hypot(pointer.x - centre.x, pointer.y - centre.y);

	if (pointer === null || centre === null || far < 1) {
		return {
			direction: {
				x: 0,
				y: 0,
			},
			near: 0,
		};
	}

	return {
		direction: {
			x: (pointer.x - centre.x) / far,
			y: (pointer.y - centre.y) / far,
		},
		near: Math.max(0, 1 - far / LEAN_REACH_PX),
	};
}
