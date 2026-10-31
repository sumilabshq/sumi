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
		const listening = new PressListening(holder, latest);
		return () => listening.stop();
	}, [holder]);
}

class PressListening<Press extends PendingPress> {
	private press: Press | null = null;
	private pressedIn: HTMLElement | null = null;

	constructor(
		private readonly holder: RefObject<HTMLElement | null>,
		private readonly ask: RefObject<LiftedPressAsk<Press>>,
	) {
		document.addEventListener("pointerdown", this.onPointerDown);
		document.addEventListener("dragstart", this.onDragStart);
	}

	stop(): void {
		this.endPress();
		document.removeEventListener("pointerdown", this.onPointerDown);
		document.removeEventListener("dragstart", this.onDragStart);
	}

	private readonly onPointerDown = (event: PointerEvent): void => {
		const holder = this.holderAround(event.target);
		this.press = holder !== null && event.button === PRIMARY_BUTTON ? this.ask.current.pressOf(holder, event) : null;
		this.pressedIn = holder;

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

		const holder = this.pressedIn;
		this.endPress();

		if (holder === null || !holder.isConnected) {
			return;
		}

		this.ask.current.onLift(holder, press, [event.clientX, event.clientY]);
	};

	private readonly onDragStart = (event: DragEvent): void => {
		if (this.holderAround(event.target) === null) {
			return;
		}

		event.preventDefault();
	};

	private holderAround(target: EventTarget | null): HTMLElement | null {
		const holder = this.holder.current;
		return holder !== null && target instanceof Node && holder.contains(target) ? holder : null;
	}

	private readonly endPress = (): void => {
		this.press = null;
		this.pressedIn = null;
		window.removeEventListener("pointermove", this.onMove);
		window.removeEventListener("pointerup", this.endPress);
		window.removeEventListener("pointercancel", this.endPress);
	};
}
