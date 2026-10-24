import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { AgentActivity } from "../../../shared/schema/agent-activity.schema.js";
import type { MascotState } from "../../../shared/schema/mascot-state.schema.js";
import type { MascotTouchHandlers } from "../../../shared/ui/mascot/mascot-figure.js";

export interface MascotTouch {
	readonly isHovered: boolean;
	readonly pokedAt: number;
	readonly wokeAt: number;
}

export interface TouchedMascot {
	readonly state: MascotState;
	readonly touchHandlers: MascotTouchHandlers;
}

interface Holds {
	readonly poked: number;
	readonly failed: number;
	readonly typed: number;
	readonly finished: number;
	readonly awake: number;
}

export const ERROR_HELD_MS = 3200;
export const DONE_HELD_MS = 2400;
export const LISTENING_HELD_MS = 1600;
export const SURPRISE_HELD_MS = 700;
export const ASLEEP_AFTER_MS = 30_000;

const NEVER = -Infinity;
const UNTOUCHED: MascotTouch = {
	isHovered: false,
	pokedAt: NEVER,
	wokeAt: NEVER,
};

export function mascotStateOf(activity: AgentActivity, now: number, touch: MascotTouch = UNTOUCHED): MascotState {
	const holds = holdsUntil(activity, touch);
	if (now < holds.poked) {
		return "surprised";
	}

	const agentState = agentStateOf(activity, now, holds);
	if (touch.isHovered && (agentState === "idle" || agentState === "listening")) {
		return "pleased";
	}

	return agentState;
}

export function nextDecisionAt(activity: AgentActivity, now: number, touch: MascotTouch): number | null {
	const ahead = Object.values(holdsUntil(activity, touch)).filter((at) => at > now);
	return ahead.length === 0 ? null : Math.min(...ahead);
}

export function useMascotState(activity: AgentActivity): TouchedMascot {
	const touch = useRef<MascotTouch>({ ...UNTOUCHED, wokeAt: Date.now() });
	const [now, setNow] = useState(Date.now);
	const decide = useCallback(() => setNow(Date.now()), []);
	const state = mascotStateOf(activity, now, touch.current);
	useEffect(decide, [activity, decide]);
	useEffect(() => {
		const at = nextDecisionAt(activity, now, touch.current);
		if (at === null) {
			return undefined;
		}

		const timer = setTimeout(decide, at - now);
		return () => clearTimeout(timer);
	}, [activity, now, decide]);
	useWakesOnPointer(touch, state === "sleep", decide);
	return { state, touchHandlers: touchHandlersOf(touch, decide) };
}

function holdsUntil(activity: AgentActivity, touch: MascotTouch): Holds {
	return {
		poked: touch.pokedAt + SURPRISE_HELD_MS,
		failed: activity.failedAt + ERROR_HELD_MS,
		typed: activity.typedAt + LISTENING_HELD_MS,
		finished: activity.finishedAt + DONE_HELD_MS,
		awake: Math.max(activity.lastAt, touch.wokeAt) + ASLEEP_AFTER_MS,
	};
}

function agentStateOf(activity: AgentActivity, now: number, holds: Holds): MascotState {
	if (activity.isAsking) {
		return "question";
	}

	if (now < holds.failed) {
		return "error";
	}

	if (activity.isRunning) {
		return activity.toolsRunning > 0 ? "working" : "thinking";
	}

	return settledStateOf(now, holds);
}

function settledStateOf(now: number, holds: Holds): MascotState {
	if (now < holds.typed) {
		return "listening";
	}

	if (now < holds.finished) {
		return "done";
	}

	return now < holds.awake ? "idle" : "sleep";
}

function touchHandlersOf(touch: RefObject<MascotTouch>, decide: () => void): MascotTouchHandlers {
	const touched = (change: Partial<MascotTouch>): void => {
		touch.current = { ...touch.current, ...change, wokeAt: Date.now() };
		decide();
	};
	return {
		onPointerEnter: () => touched({ isHovered: true }),
		onPointerLeave: () => touched({ isHovered: false }),
		onClick: () => touched({ pokedAt: Date.now() }),
	};
}

function useWakesOnPointer(touch: RefObject<MascotTouch>, isAsleep: boolean, decide: () => void): void {
	const asleep = useRef(isAsleep);
	asleep.current = isAsleep;
	useEffect(() => {
		const woke = (): void => {
			touch.current = { ...touch.current, wokeAt: Date.now() };
			if (asleep.current) {
				decide();
			}
		};
		window.addEventListener("pointermove", woke, { passive: true });
		return () => window.removeEventListener("pointermove", woke);
	}, [touch, decide]);
}
