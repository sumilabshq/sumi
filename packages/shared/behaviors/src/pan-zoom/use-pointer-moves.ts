import { useEffect, useMemo, useRef } from "react";
import type { PointerEvent as ReactPointerEvent, RefObject } from "react";
import { scaledAround, wheeled } from "@widgetarium/gpu";
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

export interface Moving {
	readonly lookNow: () => StageLook;
	readonly moveTo: (next: StageLook) => void;
}

export function useNativeWheel(
	fieldRef: RefObject<HTMLElement | null>,
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
		const stopPinch = listenToPinch(field, moving);
		return () => {
			field.removeEventListener("wheel", onWheel);
			stopPinch();
		};
	}, [fieldRef, ownScroll, lookNow, moveTo]);
}

// TRADE-OFF: WebKit sends a trackpad pinch as non-standard gesture events, not as a ctrl wheel, so they are read by name
function listenToPinch(field: HTMLElement, { lookNow, moveTo }: Moving): () => void {
	let pinchStart: StageLook | null = null;
	const onStart = (event: Event): void => {
		event.preventDefault();
		pinchStart = lookNow();
	};
	const onChange = (event: Event): void => {
		event.preventDefault();
		const scale = Reflect.get(event, "scale");

		if (pinchStart === null || typeof scale !== "number") {
			return;
		}

		moveTo(scaledAround(pinchStart, pinchStart.scale * scale, pinchPointOf(field, event)));
	};
	const onEnd = (event: Event): void => {
		event.preventDefault();
		pinchStart = null;
	};
	field.addEventListener("gesturestart", onStart);
	field.addEventListener("gesturechange", onChange);
	field.addEventListener("gestureend", onEnd);
	return () => {
		field.removeEventListener("gesturestart", onStart);
		field.removeEventListener("gesturechange", onChange);
		field.removeEventListener("gestureend", onEnd);
	};
}

function pinchPointOf(field: HTMLElement, event: Event): { readonly x: number; readonly y: number } {
	const box = field.getBoundingClientRect();
	const clientX = Reflect.get(event, "clientX");
	const clientY = Reflect.get(event, "clientY");
	return {
		x: (typeof clientX === "number" ? clientX : box.left + box.width / 2) - box.left,
		y: (typeof clientY === "number" ? clientY : box.top + box.height / 2) - box.top,
	};
}

export function useDragMoves({ lookNow, moveTo }: Moving, { isHand, pressable }: Grips): PointerMoves {
	const drag = useRef<{ x: number; y: number } | null>(null);
	return useMemo(
		() => ({
			onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
				if (!isHand || (event.target instanceof Element && event.target.closest(pressable))) return;
				const look = lookNow();
				drag.current = { x: event.clientX - look.x, y: event.clientY - look.y };
				event.currentTarget.setPointerCapture(event.pointerId);
			},
			onPointerMove: (event: ReactPointerEvent<HTMLElement>) => {
				if (!drag.current) return;
				moveTo({ ...lookNow(), x: event.clientX - drag.current.x, y: event.clientY - drag.current.y });
			},
			onPointerUp: () => void (drag.current = null),
			onPointerCancel: () => void (drag.current = null),
		}),
		[isHand, pressable, lookNow, moveTo],
	);
}
