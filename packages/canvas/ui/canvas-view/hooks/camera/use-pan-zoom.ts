import { useCallback, useEffect, useRef } from "react";
import type { MutableRefObject, RefObject } from "react";
import { centreOf, flightBetween, scaledAround } from "@widgetarium/gpu";
import type { LookWatcher, StageLook } from "@widgetarium/gpu";
import { usePainter } from "./use-painter.js";
import { useDragMoves, useNativeWheel } from "./use-pointer-moves.js";
import type { Grips, PointerMoves } from "./use-pointer-moves.js";

export interface PanZoom {
	readonly fieldRef: RefObject<HTMLDivElement | null>;
	readonly percentRef: RefObject<HTMLSpanElement | null>;
	readonly moves: PointerMoves;
	readonly zoomBy: (step: number) => void;
	readonly zoomTo: (scale: number) => void;
	readonly refit: () => void;
	readonly flyTo: (look: StageLook) => void;
	readonly lookNow: () => StageLook;
	readonly watchLook: (watcher: LookWatcher) => () => void;
}

export interface KeptCamera {
	readonly camera: StageLook | null;
	readonly onKept: (camera: StageLook) => void;
}

export const PRESSABLE_CONTROLS = "button, input, textarea, [role=radio], [role=tab], [role=switch]";

const UNMEASURED: StageLook = { x: 0, y: 0, scale: 1 };
const FOLLOWS_LAYOUT_MS = 1500;

export interface StageRefs {
	readonly layerRef: RefObject<HTMLDivElement | null>;
	readonly fieldRef: RefObject<HTMLDivElement | null>;
}

export function usePanZoom(
	{ layerRef, fieldRef }: StageRefs,
	fit: StageLook | null,
	grips: Grips,
	kept: KeptCamera,
): PanZoom {
	const percentRef = useRef<HTMLSpanElement | null>(null);
	const held = useRef<StageLook | null>(kept.camera);
	const committed = useRef<StageLook | null>(kept.camera);
	const onKept = useRef(kept.onKept);
	onKept.current = kept.onKept;
	const commit = useCallback((): void => {
		if (held.current === null) return;
		committed.current = held.current;
		onKept.current(held.current);
	}, []);
	const watchers = useRef(new Set<LookWatcher>());
	const painter = usePainter(layerRef, percentRef, watchers.current, commit);
	const flying = useRef(0);
	const lookNow = useCallback((): StageLook => held.current ?? fit ?? UNMEASURED, [fit]);
	const moveTo = useCallback(
		(next: StageLook): void => {
			window.cancelAnimationFrame(flying.current);
			held.current = next;
			painter(next);
		},
		[painter],
	);
	useKeptCameraFollowed({ held, committed, painter }, kept.camera, fit);
	useFitLatchedAfterLayout(held, fit, commit);
	useNativeWheel(fieldRef, grips.ownScroll, { lookNow, moveTo });
	return {
		fieldRef,
		percentRef,
		moves: useDragMoves({ lookNow, moveTo }, grips),
		zoomBy: (step) => moveTo(scaledAround(lookNow(), lookNow().scale + step, centreOf(fieldRef.current))),
		zoomTo: (scale) => moveTo(scaledAround(lookNow(), scale, centreOf(fieldRef.current))),
		refit: () => {
			if (fit) moveTo(fit);
		},
		flyTo: (look) => {
			window.cancelAnimationFrame(flying.current);
			const field = fieldRef.current;
			const flight = flightBetween(lookNow(), look, {
				width: field?.clientWidth ?? 0,
				height: field?.clientHeight ?? 0,
			});
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
		watchLook: useCallback((watcher: LookWatcher) => {
			watchers.current.add(watcher);
			return () => void watchers.current.delete(watcher);
		}, []),
	};
}

interface Followed {
	readonly held: MutableRefObject<StageLook | null>;
	readonly committed: MutableRefObject<StageLook | null>;
	readonly painter: (look: StageLook) => void;
}

function useKeptCameraFollowed(
	{ held, committed, painter }: Followed,
	camera: StageLook | null,
	fit: StageLook | null,
): void {
	useEffect(() => {
		if (!(camera && committed.current && isSameLook(camera, committed.current))) {
			committed.current = camera;
			held.current = camera;
		}
		const look = held.current ?? fit;
		if (look) painter(look);
	}, [held, committed, painter, camera, fit]);
}

function useFitLatchedAfterLayout(
	held: MutableRefObject<StageLook | null>,
	fit: StageLook | null,
	commit: () => void,
): void {
	const latest = useRef(fit);
	latest.current = fit;
	const isMeasured = fit !== null;
	useEffect(() => {
		if (!isMeasured) return undefined;
		const timer = window.setTimeout(() => {
			if (held.current !== null) return;
			held.current = latest.current;
			commit();
		}, FOLLOWS_LAYOUT_MS);
		return () => window.clearTimeout(timer);
	}, [held, isMeasured, commit]);
}

function isSameLook(a: StageLook, b: StageLook): boolean {
	return a.x === b.x && a.y === b.y && a.scale === b.scale;
}
