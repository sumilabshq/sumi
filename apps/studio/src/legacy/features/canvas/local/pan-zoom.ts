import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject, PointerEvent as ReactPointerEvent, RefObject } from "react";
import { movedNow, zoomSettledAt } from "./zoom-settled.js";
import { flightBetween } from "./flight.js";
import { centreOf, scaledAround, wheeled } from "./look-math.js";

export { fitLook } from "./look-math.js";

export interface Look {
	readonly x: number;
	readonly y: number;
	readonly scale: number;
}

export interface PanZoom {
	readonly fieldRef: RefObject<HTMLDivElement | null>;
	readonly percentRef: RefObject<HTMLSpanElement | null>;
	readonly moves: PointerMoves;
	readonly zoomBy: (step: number) => void;
	readonly zoomTo: (scale: number) => void;
	readonly refit: () => void;
	readonly flyTo: (look: Look) => void;
	readonly lookNow: () => Look;
	readonly watchLook: (watcher: LookWatcher) => () => void;
}

export type LookWatcher = (look: Look) => void;

export interface PanZoomGrips {
	readonly isHand: boolean;
	readonly pressable: string;
	readonly ownScroll: string | null;
}

interface PointerMoves {
	readonly onPointerDown: (event: ReactPointerEvent<HTMLElement>) => void;
	readonly onPointerMove: (event: ReactPointerEvent<HTMLElement>) => void;
	readonly onPointerUp: () => void;
	readonly onPointerCancel: () => void;
}

const UNMEASURED: Look = { x: 0, y: 0, scale: 1 };
const FOLLOWS_LAYOUT_MS = 1500;
const SHARP_AFTER_MS = 150;
const MOVING = "is-moving";
export const PRESSABLE_CONTROLS = "button, input, textarea, [role=radio], [role=tab], [role=switch]";

export function usePanZoom(
	layerRef: RefObject<HTMLDivElement | null>,
	fit: Look | null,
	{ isHand, pressable, ownScroll }: PanZoomGrips,
): PanZoom {
	const fieldRef = useRef<HTMLDivElement | null>(null);
	const percentRef = useRef<HTMLSpanElement | null>(null);
	const held = useRef<Look | null>(null);
	const watchers = useRef(new Set<LookWatcher>());
	const painter = usePainter(layerRef, percentRef, watchers.current);
	const watchLook = useCallback((watcher: LookWatcher) => {
		watchers.current.add(watcher);
		return () => void watchers.current.delete(watcher);
	}, []);
	const flying = useRef(0);
	const lookNow = useCallback((): Look => held.current ?? fit ?? UNMEASURED, [fit]);
	const moveTo = useCallback(
		(next: Look): void => {
			window.cancelAnimationFrame(flying.current);
			held.current = next;
			painter(next);
		},
		[painter],
	);
	useEffect(() => {
		const look = held.current ?? fit;
		if (look) painter(look);
	}, [painter, fit]);
	useFitLatchedAfterLayout(held, fit);
	useNativeWheel({ fieldRef, ownScroll, lookNow, moveTo });
	return {
		fieldRef,
		percentRef,
		moves: useDragMoves(lookNow, moveTo, { isHand, pressable }),
		zoomBy: (step) => moveTo(scaledAround(lookNow(), lookNow().scale + step, centreOf(fieldRef.current))),
		zoomTo: (scale) => moveTo(scaledAround(lookNow(), scale, centreOf(fieldRef.current))),
		refit: () => {
			if (!fit) return;
			window.cancelAnimationFrame(flying.current);
			held.current = fit;
			painter(fit);
		},
		flyTo: (look) => {
			window.cancelAnimationFrame(flying.current);
			const field = fieldRef.current;
			const view = { width: field?.clientWidth ?? 0, height: field?.clientHeight ?? 0 };
			const flight = flightBetween(lookNow(), look, view);
			const startedAt = performance.now();
			const step = (now: number): void => {
				const share = Math.min(1, (now - startedAt) / flight.ms);
				held.current = share === 1 ? look : flight.lookAt(share);
				painter(held.current);
				if (share < 1) flying.current = window.requestAnimationFrame(step);
			};
			flying.current = window.requestAnimationFrame(step);
		},
		lookNow,
		watchLook,
	};
}

function useFitLatchedAfterLayout(held: MutableRefObject<Look | null>, fit: Look | null): void {
	const latest = useRef(fit);
	latest.current = fit;
	const isMeasured = fit !== null;
	useEffect(() => {
		if (!isMeasured) return undefined;
		const timer = window.setTimeout(() => (held.current ??= latest.current), FOLLOWS_LAYOUT_MS);
		return () => window.clearTimeout(timer);
	}, [held, isMeasured]);
}

function usePainter(
	layerRef: RefObject<HTMLDivElement | null>,
	percentRef: RefObject<HTMLSpanElement | null>,
	watchers: ReadonlySet<LookWatcher>,
): (look: Look) => void {
	const frame = useRef(0);
	const settle = useRef(0);
	const waiting = useRef<Look | null>(null);
	return useCallback(
		(look: Look): void => {
			waiting.current = look;
			movedNow();
			if (frame.current) return;
			frame.current = window.requestAnimationFrame(() => {
				frame.current = 0;
				const layer = layerRef.current;
				const next = waiting.current;
				if (!layer || !next) return;
				layer.classList.add(MOVING);
				layer.style.transform = `translate(${next.x}px, ${next.y}px) scale(${next.scale})`;
				for (const watcher of watchers) watcher(next);
				if (percentRef.current) percentRef.current.textContent = `${Math.round(next.scale * 100)}%`;
				window.clearTimeout(settle.current);
				settle.current = window.setTimeout(() => {
					layer.classList.remove(MOVING);
					zoomSettledAt(next.scale);
				}, SHARP_AFTER_MS);
			});
		},
		[layerRef, percentRef, watchers],
	);
}

interface Wheel {
	readonly fieldRef: RefObject<HTMLDivElement | null>;
	readonly ownScroll: string | null;
	readonly lookNow: () => Look;
	readonly moveTo: (next: Look) => void;
}

function useNativeWheel({ fieldRef, ownScroll, lookNow, moveTo }: Wheel): void {
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

function useDragMoves(
	lookNow: () => Look,
	moveTo: (next: Look) => void,
	{ isHand, pressable }: Pick<PanZoomGrips, "isHand" | "pressable">,
): PointerMoves {
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
