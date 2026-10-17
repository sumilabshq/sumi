import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { MascotState } from "../schema/mascot-state.schema.js";
import type { Look } from "./scene/scene.js";

export interface Spring {
	readonly look: Look;
	readonly velocity: Look;
}

export interface MascotFrame {
	readonly look: Look;
	readonly time: number;
}

export interface BodyPose {
	readonly body: string;
	readonly shadow: string;
}

export interface MotionAsk {
	readonly state: MascotState;
	readonly isSwaying: boolean;
}

export interface Motion {
	readonly root: RefObject<HTMLDivElement | null>;
	readonly frame: MascotFrame;
}

interface PointerBox {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

export const AHEAD: Readonly<Look> = [0, 0];

const STILL: Spring = { look: AHEAD, velocity: AHEAD };
const RESTING: MascotFrame = { look: AHEAD, time: 0 };
const PULL = 140;
const DAMPING_PER_SECOND = 0.0009;
const LONGEST_STEP_S = 0.05;
const SETTLED = 0.002;
const REACH_PX = 160;
const WANDERING: ReadonlySet<MascotState> = new Set<MascotState>(["thinking", "working"]);
const FIXED_LOOKS: Partial<Readonly<Record<MascotState, Look>>> = {
	listening: [-0.8, 0.8],
	question: [0.15, -0.35],
	sleep: [0, 0.2],
	error: [0, 0.45],
	surprised: [0, -0.1],
};
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

export function lookTargetOf(state: MascotState, seconds: number, pointerLook: Look): Look {
	if (state === "thinking") {
		return [Math.cos(seconds * 2.2) * 0.75, -0.55 + Math.sin(seconds * 2.2) * 0.35];
	}

	if (state === "working") {
		return [Math.sin(seconds * 3.4) * 0.85, 0.35];
	}

	return FIXED_LOOKS[state] ?? pointerLook;
}

export function pointerLookOf(pointer: Look | null, box: PointerBox): Look {
	if (pointer === null) {
		return AHEAD;
	}

	const dx = pointer[0] - (box.left + box.width / 2);
	const dy = pointer[1] - (box.top + box.height * 0.45);
	const reach = Math.min(Math.hypot(dx, dy) / REACH_PX, 1);
	const angle = Math.atan2(dy, dx);
	return [Math.cos(angle) * reach, Math.sin(angle) * reach];
}

export function springStep(spring: Spring, target: Look, stepS: number): Spring {
	const damping = Math.pow(DAMPING_PER_SECOND, stepS);
	const velocityX = (spring.velocity[0] + (target[0] - spring.look[0]) * PULL * stepS) * damping;
	const velocityY = (spring.velocity[1] + (target[1] - spring.look[1]) * PULL * stepS) * damping;
	return {
		look: [spring.look[0] + velocityX * stepS, spring.look[1] + velocityY * stepS],
		velocity: [velocityX, velocityY],
	};
}

export function isAtRest(spring: Spring, target: Look): boolean {
	const offset = Math.abs(target[0] - spring.look[0]) + Math.abs(target[1] - spring.look[1]);
	return offset + Math.abs(spring.velocity[0]) + Math.abs(spring.velocity[1]) < SETTLED;
}

export function bodyPoseOf(look: Look, state: MascotState): BodyPose {
	const [x, y] = state === "sleep" ? AHEAD : look;
	return {
		body: `translate(${(x * 7).toFixed(1)}px, ${(y * 3).toFixed(1)}px) rotate(${(x * 7).toFixed(1)}deg)`,
		shadow: `translateX(${(x * 5).toFixed(1)}px)`,
	};
}

export function useMascotMotion(ask: MotionAsk): Motion {
	const root = useRef<HTMLDivElement | null>(null);
	const [frame, setFrame] = useState<MascotFrame>(RESTING);
	const asked = useRef(ask);
	asked.current = ask;
	const follower = useRef<LookFollower | null>(null);
	useEffect(() => {
		const node = root.current;
		if (node === null || isMotionReduced()) {
			return undefined;
		}

		const started = new LookFollower(node, () => asked.current, setFrame);
		follower.current = started;
		return started.start();
	}, []);
	useEffect(() => follower.current?.wake(), [ask.state, ask.isSwaying]);
	return { root, frame };
}

class LookFollower {
	private spring = STILL;
	private shown: Look = AHEAD;
	private pointer: Look | null = null;
	private lastFrame = 0;
	private frame: number | null = null;

	constructor(
		private readonly node: HTMLDivElement,
		private readonly askNow: () => MotionAsk,
		private readonly show: (frame: MascotFrame) => void,
	) {}

	start(): () => void {
		window.addEventListener("pointermove", this.tracked, { passive: true });
		this.wake();
		return () => {
			this.sleep();
			window.removeEventListener("pointermove", this.tracked);
		};
	}

	wake(): void {
		if (this.frame !== null) {
			return;
		}

		this.lastFrame = performance.now();
		this.frame = requestAnimationFrame(this.stepped);
	}

	private sleep(): void {
		if (this.frame !== null) {
			cancelAnimationFrame(this.frame);
		}

		this.frame = null;
	}

	private readonly tracked = (event: PointerEvent): void => {
		this.pointer = [event.clientX, event.clientY];
		this.wake();
	};

	private readonly stepped = (now: number): void => {
		const { state, isSwaying } = this.askNow();
		const target = lookTargetOf(state, now / 1000, pointerLookOf(this.pointer, this.node.getBoundingClientRect()));
		this.spring = springStep(this.spring, target, Math.min((now - this.lastFrame) / 1000, LONGEST_STEP_S));
		this.lastFrame = now;
		if (isSwaying || this.hasMoved()) {
			this.shown = this.spring.look;
			this.show({ look: this.spring.look, time: now / 1000 });
		}

		const isResting = !isSwaying && !WANDERING.has(state) && isAtRest(this.spring, target);
		this.frame = isResting ? null : requestAnimationFrame(this.stepped);
	};

	private hasMoved(): boolean {
		return Math.abs(this.spring.look[0] - this.shown[0]) + Math.abs(this.spring.look[1] - this.shown[1]) > SETTLED;
	}
}

function isMotionReduced(): boolean {
	return typeof window.matchMedia !== "function" || window.matchMedia(REDUCED_MOTION).matches;
}
