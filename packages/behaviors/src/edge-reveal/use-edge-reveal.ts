import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { EdgeIntent } from "./edge-intent.js";
import type { EdgePoint, EdgeSide } from "./edge-intent.js";

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
	const onLeave = (event: MouseEvent): void => driver.readWindowLeave(event);
	document.addEventListener("pointermove", onMove, { passive: true });
	document.documentElement.addEventListener("mouseleave", onLeave);
	return () => {
		document.removeEventListener("pointermove", onMove);
		document.documentElement.removeEventListener("mouseleave", onLeave);
		driver.stop();
	};
}

class EdgeRevealDriver {
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
		this.revealIfTucked(this.intent.sideOnMove(edgePointOf(event, frame)));
	}

	readWindowLeave(event: MouseEvent): void {
		const frame = this.latest.current.frame.current;

		if (frame === null) {
			return;
		}

		this.revealIfTucked(this.intent.sideOnWindowLeave(edgePointOf(event, frame)));
	}

	stop(): void {
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
					window.setTimeout(() => this.concealIfStillOut(side), CONCEAL_MS),
				);
			}
		}
	}

	private concealIfStillOut(side: EdgeSide): void {
		this.concealTimers.delete(side);
		const ask = this.latest.current;

		if (ask.sides[side] !== "out" || isKeyboardFocusIn(ask.panels[side].current)) {
			return;
		}

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
}

function edgePointOf(event: MouseEvent, frame: HTMLElement): EdgePoint {
	const box = frame.getBoundingClientRect();
	return {
		x: event.clientX - box.left,
		y: event.clientY - box.top,
		widthPx: box.width,
		heightPx: box.height,
		isButtonHeld: event.buttons !== NO_BUTTON,
	};
}

function isKeyboardFocusIn(panel: HTMLElement | null): boolean {
	const focused = document.activeElement;
	return panel !== null && focused !== null && panel.contains(focused) && focused.matches(KEYBOARD_FOCUS);
}
