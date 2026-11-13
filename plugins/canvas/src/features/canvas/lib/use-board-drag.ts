import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";

export interface Spot {
	readonly x: number;
	readonly y: number;
}

export interface BoardDrag {
	readonly at: Spot;
	onPointerDown(event: ReactPointerEvent<HTMLElement>): void;
	onPointerMove(event: ReactPointerEvent<HTMLElement>): void;
	onPointerUp(): void;
}

const LEAST_MOVE_PX = 3;

export function useBoardDrag(placed: Spot, scaleNow: () => number, onDrop: (to: Spot) => void): BoardDrag {
	const pressed = useRef<Spot | null>(null);
	const [held, setHeld] = useState<Spot | null>(null);
	useEffect(() => setHeld(null), [placed.x, placed.y]);
	return {
		at: held ?? placed,
		onPointerDown: (event) => {
			pressed.current = pressOf(event);
		},
		onPointerMove: (event) => {
			if (pressed.current !== null) {
				setHeld(movedSpotOf(placed, pressed.current, event, scaleNow()));
			}
		},
		onPointerUp: () => {
			pressed.current = null;
			finishDrag(placed, held, { setHeld, onDrop });
		},
	};
}

interface DragEnds {
	setHeld(held: Spot | null): void;
	onDrop(to: Spot): void;
}

function finishDrag(placed: Spot, held: Spot | null, { setHeld, onDrop }: DragEnds): void {
	if (held === null || !isMoved(placed, held)) {
		setHeld(null);
		return;
	}

	onDrop(roundedSpotOf(held));
}

function pressOf(event: ReactPointerEvent<HTMLElement>): Spot | null {
	if (event.button !== 0) {
		return null;
	}

	event.currentTarget.setPointerCapture(event.pointerId);
	return {
		x: event.clientX,
		y: event.clientY,
	};
}

function movedSpotOf(placed: Spot, pressed: Spot, event: ReactPointerEvent<HTMLElement>, scale: number): Spot {
	return {
		x: placed.x + (event.clientX - pressed.x) / scale,
		y: placed.y + (event.clientY - pressed.y) / scale,
	};
}

function isMoved(placed: Spot, held: Spot): boolean {
	return Math.hypot(held.x - placed.x, held.y - placed.y) >= LEAST_MOVE_PX;
}

function roundedSpotOf({ x, y }: Spot): Spot {
	return {
		x: Math.round(x),
		y: Math.round(y),
	};
}
