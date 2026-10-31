import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

const GLIDED = "[data-tasks-glide]";
const GLIDE_ID = "wg-tasks-glide";
const GLIDE_DURATION = "--sumi-dur-slow";
const GLIDE_EASE = "--sumi-ease-out";
const SETTLED_PX = 1;

interface Point {
	readonly x: number;
	readonly y: number;
}

interface Spot extends Point {
	readonly parent: string | null;
}

type Spots = ReadonlyMap<string, Spot>;

const STILL: Point = {
	x: 0,
	y: 0,
};

export function useGlidesBoard(board: RefObject<HTMLElement | null>): void {
	const lastSpots = useRef<Spots>(new Map());
	useLayoutEffect(() => {
		const root = board.current;

		if (root === null) {
			return;
		}

		lastSpots.current = glideBoard(root, lastSpots.current);
	});
}

function glideBoard(root: HTMLElement, was: Spots): Spots {
	const glided = glidedIn(root);
	const offsets = offsetsStopped(glided);
	const spots = spotsOf(root, glided);
	glideMoved(root, glided, {
		was,
		now: spots,
		offsets,
	});
	return spots;
}

function glidedIn(root: HTMLElement): ReadonlyMap<string, HTMLElement> {
	const glided = new Map<string, HTMLElement>();

	for (const element of root.querySelectorAll<HTMLElement>(GLIDED)) {
		const key = element.dataset["tasksGlide"];

		if (key !== undefined && !glided.has(key) && element.offsetParent !== null) {
			glided.set(key, element);
		}
	}

	return glided;
}

function offsetsStopped(glided: ReadonlyMap<string, HTMLElement>): ReadonlyMap<string, Point> {
	const offsets = new Map<string, Point>();

	for (const [key, element] of glided) {
		const running = element.getAnimations().filter((animation) => animation.id === GLIDE_ID);

		if (running.length > 0) {
			const matrix = new DOMMatrixReadOnly(getComputedStyle(element).transform);
			offsets.set(key, {
				x: matrix.m41,
				y: matrix.m42,
			});
			running.forEach((animation) => animation.cancel());
		}
	}

	return offsets;
}

function spotsOf(root: HTMLElement, glided: ReadonlyMap<string, HTMLElement>): Spots {
	const origin = root.getBoundingClientRect();
	const spots = new Map<string, Spot>();

	for (const [key, element] of glided) {
		const box = element.getBoundingClientRect();
		spots.set(key, {
			x: box.left - origin.left,
			y: box.top - origin.top,
			parent: element.parentElement?.closest<HTMLElement>(GLIDED)?.dataset["tasksGlide"] ?? null,
		});
	}

	return spots;
}

interface GlideAsk {
	readonly was: Spots;
	readonly now: Spots;
	readonly offsets: ReadonlyMap<string, Point>;
}

function glideMoved(root: HTMLElement, glided: ReadonlyMap<string, HTMLElement>, ask: GlideAsk): void {
	const timing = glideTimingOf(root);

	if (timing === null || ask.was.size === 0) {
		return;
	}

	const starts = new Map<string, Point>();

	for (const [key, element] of glided) {
		const start = startOf(key, ask, starts);
		starts.set(key, start);

		if (Math.abs(start.x) >= SETTLED_PX || Math.abs(start.y) >= SETTLED_PX) {
			element.animate([{ transform: `translate(${start.x}px, ${start.y}px)` }, { transform: "none" }], timing);
		}
	}
}

function glideTimingOf(root: HTMLElement): KeyframeAnimationOptions | null {
	const style = getComputedStyle(root);
	const durationMs = parseFloat(style.getPropertyValue(GLIDE_DURATION)) || 0;

	if (durationMs === 0) {
		return null;
	}

	return {
		id: GLIDE_ID,
		duration: durationMs,
		easing: style.getPropertyValue(GLIDE_EASE).trim() || "ease-out",
	};
}

function startOf(key: string, { was, now, offsets }: GlideAsk, starts: ReadonlyMap<string, Point>): Point {
	const from = was.get(key);
	const to = now.get(key);

	if (from === undefined || to === undefined) {
		return STILL;
	}

	const own = offsets.get(key) ?? STILL;
	const carried = from.parent === null ? STILL : (offsets.get(from.parent) ?? STILL);
	const parentStart = to.parent === null ? STILL : (starts.get(to.parent) ?? STILL);
	return {
		x: from.x + own.x + carried.x - to.x - parentStart.x,
		y: from.y + own.y + carried.y - to.y - parentStart.y,
	};
}
