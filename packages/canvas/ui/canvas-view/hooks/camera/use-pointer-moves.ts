import { useEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { wheeled } from "@widgetarium/gpu";
import type { StageLook } from "@widgetarium/gpu";

export interface PointerMoves {
	readonly onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
	readonly onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
	readonly onPointerUp: () => void;
	readonly onPointerCancel: () => void;
}

export interface Grips {
	readonly isHand: boolean;
	readonly pressable: string;
	readonly ownScroll: string | null;
}

interface Moving {
	readonly lookNow: () => StageLook;
	readonly moveTo: (next: StageLook) => void;
}

export function useNativeWheel(
	fieldRef: RefObject<HTMLDivElement | null>,
	ownScroll: string | null,
	moving: Moving,
): void {
	const { lookNow, moveTo } = moving;
	useEffect(() => {
		const field = fieldRef.current;
		if (!field) return;
		const onWheel = (event: WheelEvent): void => {
			if (ownScroll !== null && event.target instanceof Element && event.target.closest(ownScroll)) return;
			event.preventDefault();
			event.stopPropagation();
			const box = field.getBoundingClientRect();
			moveTo(wheeled(lookNow(), event, { x: event.clientX - box.left, y: event.clientY - box.top }));
		};
		field.addEventListener("wheel", onWheel, { passive: false });
		return () => field.removeEventListener("wheel", onWheel);
	}, [fieldRef, ownScroll, lookNow, moveTo]);
}

export function useDragMoves({ lookNow, moveTo }: Moving, { isHand, pressable }: Grips): PointerMoves {
	const drag = useRef<{ x: number; y: number } | null>(null);
	return {
		onPointerDown: (event) => {
			if (!isHand || (event.target instanceof Element && event.target.closest(pressable))) return;
			const look = lookNow();
			drag.current = { x: event.clientX - look.x, y: event.clientY - look.y };
			event.currentTarget.setPointerCapture(event.pointerId);
		},
		onPointerMove: (event) => {
			if (!drag.current) return;
			moveTo({ ...lookNow(), x: event.clientX - drag.current.x, y: event.clientY - drag.current.y });
		},
		onPointerUp: () => void (drag.current = null),
		onPointerCancel: () => void (drag.current = null),
	};
}
