import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { POPOVER_ITEM } from "../constants/popover";
import type { Placement } from "../constants/popover";
import { returnFocusTo } from "../utils/focus";
import { endFold, enterPanel, exitPanel, keepPanelPlaced, restPanel } from "../utils/popover-motion";
import { prefersReducedMotion } from "../utils/reduced-motion";
import type { StopMotion } from "../utils/popover-motion";

export interface PanelMotionAsk {
	readonly isOpen: boolean;
	readonly where: Placement;
	readonly anchorRef: RefObject<HTMLElement | null>;
	readonly pointRef: RefObject<HTMLElement | null>;
	readonly panelRef: RefObject<HTMLElement | null>;
	readonly triggerRef: RefObject<HTMLElement | null>;
	readonly openedByKeyboard: RefObject<boolean>;
	readonly release: () => void;
	readonly onExited?: (() => void) | undefined;
}

interface MotionMemory {
	readonly wasOpen: RefObject<boolean>;
	readonly stopExit: RefObject<StopMotion | null>;
	readonly latest: RefObject<PanelMotionAsk>;
}

const SETTLE_STEP_MS = 50;
const SETTLE_TRIES = 12;

export function usePanelMotion(ask: PanelMotionAsk): void {
	const wasOpen = useRef(false);
	const stopExit = useRef<StopMotion | null>(null);
	const latest = useRef(ask);
	latest.current = ask;
	useLayoutEffect(() => movePanel(ask, { wasOpen, stopExit, latest }), [ask.isOpen, ask.where.key]);
	useLayoutEffect(() => keepsPlacedWhileOpen(latest), [ask.isOpen, ask.where.key]);
}

function keepsPlacedWhileOpen(latest: RefObject<PanelMotionAsk>): (() => void) | undefined {
	const panel = latest.current.panelRef.current;

	if (!latest.current.isOpen || panel === null || typeof ResizeObserver === "undefined") {
		return undefined;
	}

	let retry = 0;
	const placeWhenSettled = (triesLeft: number): void => {
		const anchor = motionAnchorOf(latest.current);

		if (anchor === null || !latest.current.isOpen || keepPanelPlaced(panel, anchor, latest.current.where)) {
			return;
		}

		if (triesLeft > 0) {
			retry = window.setTimeout(() => placeWhenSettled(triesLeft - 1), SETTLE_STEP_MS);
		}
	};
	const observer = new ResizeObserver(() => {
		window.clearTimeout(retry);
		placeWhenSettled(SETTLE_TRIES);
	});
	observer.observe(panel);
	return () => {
		observer.disconnect();
		window.clearTimeout(retry);
	};
}

function movePanel(ask: PanelMotionAsk, memory: MotionMemory): StopMotion | undefined {
	const panel = ask.panelRef.current;
	const anchor = motionAnchorOf(ask);
	if (!panel || !anchor) return releaseWhenClosed(ask, memory);
	const isClosing = memory.wasOpen.current && !ask.isOpen;
	memory.wasOpen.current = ask.isOpen;
	stopExiting(memory.stopExit);
	if (isClosing) returnFocusIfInside(panel, ask.triggerRef.current ?? anchor);
	if (ask.isOpen) return openPanel(panel, anchor, ask);
	if (isClosing) return foldAndRelease(panel, anchor, memory);
	restPanel(panel, anchor);
	memory.latest.current.release();
	return undefined;
}

function motionAnchorOf({ pointRef, where, triggerRef, anchorRef }: PanelMotionAsk): HTMLElement | null {
	return pointRef.current ?? (where.measuresTrigger ? triggerRef.current : null) ?? anchorRef.current;
}

function releaseWhenClosed(ask: PanelMotionAsk, { latest }: MotionMemory): undefined {
	if (!ask.isOpen) latest.current.release();
	return undefined;
}

function stopExiting(stopExit: RefObject<StopMotion | null>): void {
	stopExit.current?.();
	stopExit.current = null;
}

function returnFocusIfInside(panel: HTMLElement, target: HTMLElement): void {
	if (panel.contains(document.activeElement)) returnFocusTo(target);
}

function foldAndRelease(panel: HTMLElement, anchor: HTMLElement, { stopExit, latest }: MotionMemory): StopMotion {
	stopExit.current = closePanel(panel, anchor, () => {
		stopExit.current = null;
		latest.current.onExited?.();
		latest.current.release();
	});
	return () => stopExiting(stopExit);
}

function closePanel(panel: HTMLElement, anchor: HTMLElement, done: () => void): StopMotion | null {
	const finish = (): void => {
		endFold(panel, anchor);
		done();
	};
	if (prefersReducedMotion()) {
		finish();
		return null;
	}
	return exitPanel(panel, anchor, finish);
}

function openPanel(panel: HTMLElement, anchor: HTMLElement, ask: PanelMotionAsk): StopMotion | undefined {
	if (ask.anchorRef.current && ask.anchorRef.current !== anchor) ask.anchorRef.current.style.visibility = "";
	const stopEnter = enterPanel(panel, anchor, ask.where);
	if (ask.openedByKeyboard.current) panel.querySelector<HTMLElement>(POPOVER_ITEM)?.focus();
	return stopEnter;
}
