import type { AnchorBox } from "../constants/popover";

interface Point {
	readonly x: number;
	readonly y: number;
}

const POINTER_EVENTS = ["pointerdown", "pointermove", "contextmenu", "mousedown"] as const;

let lastPoint: Point | null = null;
let isKeyboardDriven = false;

if (typeof document !== "undefined") {
	for (const name of POINTER_EVENTS) {
		document.addEventListener(
			name,
			(event) => {
				isKeyboardDriven = false;
				if (event instanceof MouseEvent) lastPoint = { x: event.clientX, y: event.clientY };
			},
			{ capture: true, passive: true },
		);
	}
	document.addEventListener("keydown", () => (isKeyboardDriven = true), { capture: true, passive: true });
}

export function pivotOf(anchor: AnchorBox): Point {
	if (lastPoint !== null && !isKeyboardDriven) return lastPoint;
	return { x: anchor.left + anchor.width / 2, y: anchor.top + anchor.height / 2 };
}
