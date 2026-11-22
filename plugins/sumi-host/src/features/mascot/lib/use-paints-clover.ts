import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { CLOVER_LOOKS, paintClover } from "./clover-paint.js";
import type { CloverInks } from "./clover-paint.js";
import type { SumiState } from "./sumi-state.js";

export const MOST_TILT = 0.4;

const ERROR_TILT = 0.5;
const IDLE_SWAY = 0.06;
const TILT_REACH_PX = 320;
const TILT_PER_S = 6;
const LONGEST_FRAME_S = 0.032;
const SHARPEST_SCALE = 2;

interface Wanted {
	readonly state: SumiState;
	readonly look: number;
}

interface Plant {
	readonly canvas: HTMLCanvasElement;
	readonly context: CanvasRenderingContext2D;
	readonly size: number;
}

interface Motion {
	pointerX: number | null;
	tilt: number;
	lastAt: number | null;
}

export function usePaintsClover(state: SumiState, size: number): RefObject<HTMLCanvasElement | null> {
	const canvas = useRef<HTMLCanvasElement | null>(null);
	const wanted = useRef<Wanted>({
		state,
		look: 0,
	});

	if (wanted.current.state !== state) {
		wanted.current = {
			state,
			look: state === "surprised" ? wanted.current.look + 1 : wanted.current.look,
		};
	}

	useEffect(() => {
		const plant = plantOf(canvas.current, size);

		if (plant === null) {
			return undefined;
		}

		if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
			paint(plant, wanted.current, { seconds: 0, tilt: 0 });
			return undefined;
		}

		return runsPaint(plant, wanted);
	}, [size, state]);
	return canvas;
}

function plantOf(canvas: HTMLCanvasElement | null, size: number): Plant | null {
	const context = canvas?.getContext("2d") ?? null;

	if (canvas === null || context === null) {
		return null;
	}

	const scale = Math.min(SHARPEST_SCALE, window.devicePixelRatio || 1);
	canvas.width = Math.round(size * scale);
	canvas.height = Math.round(size * scale);
	context.setTransform(scale, 0, 0, scale, 0, 0);
	return {
		canvas,
		context,
		size,
	};
}

function runsPaint(plant: Plant, wanted: RefObject<Wanted>): () => void {
	const motion: Motion = {
		pointerX: null,
		tilt: 0,
		lastAt: null,
	};
	const heard = (event: PointerEvent): void => {
		motion.pointerX = event.clientX;
	};
	let frame = requestAnimationFrame(function stepped(now) {
		const seconds = now / 1000;
		const dt = motion.lastAt === null ? 0.016 : Math.min(LONGEST_FRAME_S, seconds - motion.lastAt);
		motion.lastAt = seconds;
		motion.tilt +=
			(tiltGoalOf(plant, wanted.current.state, motion.pointerX, seconds) - motion.tilt) * Math.min(1, dt * TILT_PER_S);
		paint(plant, wanted.current, { seconds, tilt: motion.tilt });
		frame = requestAnimationFrame(stepped);
	});
	window.addEventListener("pointermove", heard, { passive: true });
	return () => {
		cancelAnimationFrame(frame);
		window.removeEventListener("pointermove", heard);
	};
}

function tiltGoalOf(plant: Plant, state: SumiState, pointerX: number | null, seconds: number): number {
	if (state === "error") {
		return ERROR_TILT;
	}

	if (state === "asleep") {
		return 0;
	}

	if (pointerX === null) {
		return IDLE_SWAY * Math.sin(seconds * 0.8);
	}

	const box = plant.canvas.getBoundingClientRect();
	return Math.max(-1, Math.min(1, (pointerX - box.left - box.width / 2) / TILT_REACH_PX)) * MOST_TILT;
}

function paint(plant: Plant, wanted: Wanted, moment: { readonly seconds: number; readonly tilt: number }): void {
	paintClover(plant.context, {
		size: plant.size,
		seconds: moment.seconds,
		state: wanted.state,
		look: CLOVER_LOOKS[wanted.look % CLOVER_LOOKS.length] ?? "grid",
		tilt: moment.tilt,
		inks: inksOf(plant.canvas),
	});
}

function inksOf(canvas: HTMLCanvasElement): CloverInks {
	const style = getComputedStyle(canvas);
	return {
		ink: style.color,
		danger: style.getPropertyValue("--sumi-danger"),
		warning: style.getPropertyValue("--sumi-warning"),
		accent: style.getPropertyValue("--sumi-accent"),
		quiet: style.getPropertyValue("--sumi-text-3"),
	};
}
