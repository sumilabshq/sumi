import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { EdgeIntent } from "./edge-intent.js";
import type { EdgeMove, EdgeSide } from "./edge-intent.js";

export type EdgeLook = "fixed" | "tucked" | "out";

export interface EdgeRevealAsk {
	readonly frame: RefObject<HTMLElement | null>;
	readonly content: RefObject<HTMLElement | null>;
	readonly panels: Readonly<Record<EdgeSide, RefObject<HTMLElement | null>>>;
	readonly sides: Readonly<Record<EdgeSide, EdgeLook>>;
	readonly reveal: (side: EdgeSide) => void;
	readonly conceal: (side: EdgeSide) => void;
}

const CONCEAL_MS = 150;
const SIDES: readonly EdgeSide[] = ["left", "right"];
const NO_BUTTON = 0;
const KEYBOARD_FOCUS = ":focus-visible";

export function useEdgeReveal(ask: EdgeRevealAsk): void {
	const latest = useRef(ask);
	latest.current = ask;

	useEffect(() => followPointer(new EdgeRevealDriver(latest, new EdgeIntent())), []);
}

function followPointer(driver: EdgeRevealDriver): () => void {
	const onMove = (event: PointerEvent): void => driver.readMove(event);
	const onLeave = (event: PointerEvent): void => driver.readWindowLeave(event);
	document.addEventListener("pointermove", onMove, { passive: true });
	document.documentElement.addEventListener("pointerleave", onLeave);
	return () => {
		document.removeEventListener("pointermove", onMove);
		document.documentElement.removeEventListener("pointerleave", onLeave);
		driver.stop();
	};
}

class EdgeRevealDriver {
	private dwellTimer: number | null = null;
	private readonly concealTimers = new Map<EdgeSide, number>();

	constructor(
		private readonly latest: RefObject<EdgeRevealAsk>,
		private readonly intent: EdgeIntent,
	) {}

	readMove(event: PointerEvent): void {
		const ask = this.latest.current;
		const frame = ask.frame.current;

		if (frame === null) {
			return;
		}

		this.concealOnContent(ask, event);
		const now = performance.now();
		this.intent.readMove(edgeMoveOf(event, frame.getBoundingClientRect(), now));
		this.armDwell(now);
	}

	readWindowLeave(event: PointerEvent): void {
		const frame = this.latest.current.frame.current;
		this.stop();

		if (frame === null) {
			return;
		}

		this.revealIfTucked(
			this.intent.sideOnWindowLeave(edgeMoveOf(event, frame.getBoundingClientRect(), performance.now())),
		);
	}

	stop(): void {
		this.clearDwell();

		for (const side of SIDES) {
			this.cancelConceal(side);
		}
	}

	private concealOnContent(ask: EdgeRevealAsk, event: PointerEvent): void {
		const isOnContent = event.target instanceof Node && ask.content.current?.contains(event.target) === true;

		for (const side of SIDES) {
			if (ask.sides[side] !== "out" || !isOnContent) {
				this.cancelConceal(side);
				continue;
			}

			if (!this.concealTimers.has(side)) {
				this.concealTimers.set(
					side,
					window.setTimeout(() => this.conceal(side), CONCEAL_MS),
				);
			}
		}
	}

	private conceal(side: EdgeSide): void {
		this.concealTimers.delete(side);
		const ask = this.latest.current;

		if (ask.sides[side] !== "out" || isKeyboardFocusIn(ask.panels[side].current)) {
			return;
		}

		this.intent.startQuietPeriod(performance.now());
		ask.conceal(side);
	}

	private cancelConceal(side: EdgeSide): void {
		const timer = this.concealTimers.get(side);

		if (timer === undefined) {
			return;
		}

		window.clearTimeout(timer);
		this.concealTimers.delete(side);
	}

	private revealIfTucked(side: EdgeSide | null): void {
		if (side === null || this.latest.current.sides[side] !== "tucked") {
			return;
		}

		this.latest.current.reveal(side);
	}

	private armDwell(now: number): void {
		this.clearDwell();
		const due = this.intent.dueAt();

		if (due === null) {
			return;
		}

		if (due <= now) {
			this.revealDueSide();
			return;
		}

		this.dwellTimer = window.setTimeout(() => {
			this.dwellTimer = null;
			this.revealDueSide();
		}, due - now);
	}

	private revealDueSide(): void {
		this.revealIfTucked(this.intent.takeDueSide(performance.now()));
	}

	private clearDwell(): void {
		if (this.dwellTimer === null) {
			return;
		}

		window.clearTimeout(this.dwellTimer);
		this.dwellTimer = null;
	}
}

function edgeMoveOf(event: PointerEvent, box: DOMRect, now: number): EdgeMove {
	return {
		t: now,
		x: event.clientX - box.left,
		y: event.clientY - box.top,
		pushX: event.movementX,
		pushY: event.movementY,
		widthPx: box.width,
		isButtonHeld: event.buttons !== NO_BUTTON,
		flushSides: readFlushSides(),
	};
}

function isKeyboardFocusIn(panel: HTMLElement | null): boolean {
	const focused = document.activeElement;
	return panel !== null && focused !== null && panel.contains(focused) && focused.matches(KEYBOARD_FOCUS);
}

function readFlushSides(): Readonly<Record<EdgeSide, boolean>> {
	const screenLeft = availLeftOf(window.screen);
	const screenRight = screenLeft + window.screen.availWidth;

	return {
		left: window.screenX <= screenLeft + 1,
		right: window.screenX + window.outerWidth >= screenRight - 1,
	};
}

function availLeftOf(screen: Screen): number {
	return "availLeft" in screen && typeof screen.availLeft === "number" ? screen.availLeft : 0;
}
