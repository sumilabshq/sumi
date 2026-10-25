import { useEffect, useRef } from "react";
import type { RefObject } from "react";

export interface PendingPress {
	readonly pointerId: number;
	readonly start: readonly [number, number];
}

export interface LiftedPressAsk<Press extends PendingPress> {
	readonly pressOf: (holder: HTMLElement, event: PointerEvent) => Press | null;
	readonly onLift: (holder: HTMLElement, press: Press, now: readonly [number, number]) => void;
}

const PRIMARY_BUTTON = 0;
const LIFT_PX = 4;

export function useLiftedPress<Press extends PendingPress>(
	holder: RefObject<HTMLElement | null>,
	ask: LiftedPressAsk<Press>,
): void {
	const latest = useRef(ask);
	latest.current = ask;
	useEffect(() => {
		const element = holder.current;

		if (element === null) {
			return;
		}

		const listening = new PressListening(element, latest);
		return () => listening.stop();
	}, [holder]);
}

class PressListening<Press extends PendingPress> {
	private press: Press | null = null;

	constructor(
		private readonly holder: HTMLElement,
		private readonly ask: RefObject<LiftedPressAsk<Press>>,
	) {
		holder.addEventListener("pointerdown", this.onPointerDown);
		holder.addEventListener("dragstart", preventNativeDrag);
	}

	stop(): void {
		this.endPress();
		this.holder.removeEventListener("pointerdown", this.onPointerDown);
		this.holder.removeEventListener("dragstart", preventNativeDrag);
	}

	private readonly onPointerDown = (event: PointerEvent): void => {
		this.press = event.button === PRIMARY_BUTTON ? this.ask.current.pressOf(this.holder, event) : null;

		if (this.press === null) {
			return;
		}

		window.addEventListener("pointermove", this.onMove);
		window.addEventListener("pointerup", this.endPress);
		window.addEventListener("pointercancel", this.endPress);
	};

	private readonly onMove = (event: PointerEvent): void => {
		const { press } = this;

		if (press === null || event.pointerId !== press.pointerId) {
			return;
		}

		if (Math.hypot(event.clientX - press.start[0], event.clientY - press.start[1]) < LIFT_PX) {
			return;
		}

		this.endPress();
		this.ask.current.onLift(this.holder, press, [event.clientX, event.clientY]);
	};

	private readonly endPress = (): void => {
		this.press = null;
		window.removeEventListener("pointermove", this.onMove);
		window.removeEventListener("pointerup", this.endPress);
		window.removeEventListener("pointercancel", this.endPress);
	};
}

function preventNativeDrag(event: DragEvent): void {
	event.preventDefault();
}
