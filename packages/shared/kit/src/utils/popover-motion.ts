import { EXIT_GUARD_MS } from "../constants/popover";
import type { AnchorBox, Placement } from "../constants/popover";
import { viewportSize } from "./floating-placement";
import { prefersReducedMotion } from "./reduced-motion";
import { laidFrameOf, wearAnchorWidth, wearSpot } from "./wear-spot";

export type StopMotion = () => void;

const EXIT_ANIMATION = "wg-kit-pop-out";

export function restPanel(panel: HTMLElement, anchor: HTMLElement): void {
	panel.style.visibility = "";
	anchor.style.visibility = "";
}

export function endFold(panel: HTMLElement, anchor: HTMLElement): void {
	restPanel(panel, anchor);
	panel.style.visibility = "hidden";
}

export function enterPanel(panel: HTMLElement, anchor: HTMLElement, placement: Placement): StopMotion | undefined {
	panel.style.visibility = "";
	placePopoverPanel(panel, anchor.getBoundingClientRect(), placement);
	anchor.style.visibility = placement.hidesTrigger ? "hidden" : "";
	return undefined;
}

export function exitPanel(panel: HTMLElement, done: () => void): StopMotion {
	if (prefersReducedMotion()) {
		done();
		return () => undefined;
	}
	const finish = (event?: AnimationEvent): void => {
		if (event && (event.target !== panel || event.animationName !== EXIT_ANIMATION)) return;
		stop();
		done();
	};
	const guard = setTimeout(() => finish(), EXIT_GUARD_MS);
	const stop = (): void => {
		clearTimeout(guard);
		panel.removeEventListener("animationend", finish);
	};
	panel.addEventListener("animationend", finish);
	return stop;
}

export function keepPanelPlaced(panel: HTMLElement, anchor: HTMLElement, placement: Placement): boolean {
	if (isInMotion(panel)) return false;
	panel.style.left = "0px";
	panel.style.top = "0px";
	const frame = laidFrameOf(panel);
	const box = anchor.getBoundingClientRect();
	wearSpot(panel, placement.solve(box, panel.getBoundingClientRect(), viewportSize()), box, frame);
	return true;
}

function isInMotion(panel: HTMLElement): boolean {
	if (typeof panel.getAnimations !== "function") return false;
	return panel.getAnimations().some((motion) => motion.playState === "running");
}

function placePopoverPanel(panel: HTMLElement, anchor: AnchorBox, placement: Placement): void {
	panel.style.animation = "none";
	panel.style.left = "0px";
	panel.style.top = "0px";
	const frame = laidFrameOf(panel);
	wearAnchorWidth(panel, anchor, frame);
	wearSpot(panel, placement.solve(anchor, panel.getBoundingClientRect(), viewportSize()), anchor, frame);
	panel.style.animation = "";
}
