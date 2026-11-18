import { useRef } from "react";
import type { PointerEvent } from "react";

export interface RailWidth {
	readonly widthPx: number;
	onWidth(px: number): void;
	onWidthDone(px: number): void;
}

export interface RailDrag {
	readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerUp: (event: PointerEvent<HTMLElement>) => void;
	readonly onPointerCancel: (event: PointerEvent<HTMLElement>) => void;
}

interface RailGrab {
	readonly pointerX: number;
	readonly widthPx: number;
}

const PRIMARY_BUTTON = 0;

export function useRailDrag({ widthPx, onWidth, onWidthDone }: RailWidth): RailDrag {
	const grab = useRef<RailGrab | null>(null);
	const widthAt = (event: PointerEvent<HTMLElement>): number | null => {
		const held = grab.current;
		return held === null ? null : held.widthPx + event.clientX - held.pointerX;
	};
	const release = (event: PointerEvent<HTMLElement>): void => {
		const px = widthAt(event);
		grab.current = null;

		if (px !== null) {
			onWidthDone(px);
		}
	};
	return {
		onPointerDown: (event) => {
			if (event.button !== PRIMARY_BUTTON) {
				return;
			}

			event.preventDefault();
			event.currentTarget.setPointerCapture(event.pointerId);
			grab.current = {
				pointerX: event.clientX,
				widthPx,
			};
		},
		onPointerMove: (event) => {
			const px = widthAt(event);

			if (px !== null) {
				onWidth(px);
			}
		},
		onPointerUp: release,
		onPointerCancel: release,
	};
}
