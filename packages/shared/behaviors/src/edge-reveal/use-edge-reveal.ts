import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { CursorOutside } from "./cursor-outside.js";
import { RestReveal } from "./edge-rest.js";
import { EDGE_SIDES, EdgeIntent } from "./edge-intent.js";
import type { EdgePoint } from "./edge-intent.js";
import type { EdgeRevealAsk } from "./edge-reveal-ask.js";

export type { EdgeLook, EdgeRevealAsk, ReadCursor } from "./edge-reveal-ask.js";
const NO_BUTTON = 0;
const KEYBOARD_FOCUS = ":focus-visible";

export function useEdgeReveal(ask: EdgeRevealAsk): void {
	const latest = useRef(ask);
	latest.current = ask;

	useEffect(
		() =>
			followPointer(new EdgeRevealDriver(latest, new EdgeIntent(), new CursorOutside(latest), new RestReveal(latest))),
		[],
	);
}

function followPointer(driver: EdgeRevealDriver): () => void {
	const onMove = (event: PointerEvent): void => driver.readMove(event);
	const onOver = (event: PointerEvent): void => driver.readOver(event);
	const onLeave = (event: MouseEvent): void => driver.readWindowLeave(event);
	document.addEventListener("pointermove", onMove, { passive: true });
	document.addEventListener("pointerover", onOver, { passive: true });
	document.documentElement.addEventListener("mouseleave", onLeave);
	return () => {
		document.removeEventListener("pointermove", onMove);
		document.removeEventListener("pointerover", onOver);
		document.documentElement.removeEventListener("mouseleave", onLeave);
		driver.stop();
	};
}

class EdgeRevealDriver {
	constructor(
		private readonly latest: RefObject<EdgeRevealAsk>,
		private readonly intent: EdgeIntent,
		private readonly outside: CursorOutside,
		private readonly rest: RestReveal,
	) {}

	readMove(event: PointerEvent): void {
		const ask = this.latest.current;
		const frame = ask.frame.current;

		if (frame === null) {
			return;
		}

		this.foldOnContent(ask, event);
		this.rest.watchRestAt(this.intent.sideOnMove(edgePointOf(event, frame)), {
			x: event.clientX,
			y: event.clientY,
		});
	}

	readOver(event: PointerEvent): void {
		this.foldOnContent(this.latest.current, event);
	}

	readWindowLeave(event: MouseEvent): void {
		const frame = this.latest.current.frame.current;

		if (frame === null) {
			return;
		}

		this.rest.cancel();
		this.outside.follow(this.intent.sideOnWindowLeave(edgePointOf(event, frame)));
	}

	stop(): void {
		this.rest.cancel();
		this.outside.stop();
	}

	private foldOnContent(ask: EdgeRevealAsk, event: PointerEvent): void {
		const isOnContent = event.target instanceof Node && ask.content.current?.contains(event.target) === true;

		if (!isOnContent) {
			return;
		}

		this.rest.cancel();

		for (const side of EDGE_SIDES) {
			if (ask.sides[side] === "out" && !isKeyboardFocusIn(ask.panels[side].current)) {
				ask.conceal(side);
			}
		}
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
