export interface Point {
	readonly x: number;
	readonly y: number;
}

export interface PointerWatch {
	readonly onMove: (point: Point) => void;
	readonly onEnd: (point: Point | null) => void;
}

export function trackPointer({ onMove, onEnd }: PointerWatch): void {
	const move = (event: PointerEvent): void => onMove(pointOf(event));
	const up = (event: PointerEvent): void => finish(pointOf(event));
	const cancel = (): void => finish(null);
	const escape = (event: KeyboardEvent): void => {
		if (event.key === "Escape") {
			finish(null);
		}
	};
	const finish = (point: Point | null): void => {
		window.removeEventListener("pointermove", move);
		window.removeEventListener("pointerup", up);
		window.removeEventListener("pointercancel", cancel);
		window.removeEventListener("keydown", escape);
		onEnd(point);
	};
	window.addEventListener("pointermove", move);
	window.addEventListener("pointerup", up);
	window.addEventListener("pointercancel", cancel);
	window.addEventListener("keydown", escape);
}

function pointOf(event: PointerEvent): Point {
	return { x: event.clientX, y: event.clientY };
}
