import type { AnchorBox, FloatingSpot, PanelSpot } from "../constants/popover";
import { pivotOf } from "./pointer-point";

export interface LaidFrame extends PanelSpot {
	readonly scale: number;
}

const VIEWPORT_FRAME: LaidFrame = { left: 0, top: 0, scale: 1 };

export function laidFrameOf(panel: HTMLElement): LaidFrame {
	const laid = panel.getBoundingClientRect();
	if (panel.offsetWidth === 0 || laid.width === 0) return { left: laid.left, top: laid.top, scale: 1 };
	return { left: laid.left, top: laid.top, scale: laid.width / panel.offsetWidth };
}

export function wearAnchorWidth(panel: HTMLElement, anchor: AnchorBox, frame: LaidFrame = VIEWPORT_FRAME): void {
	panel.style.setProperty("--anchor-width", `${anchor.width / frame.scale}px`);
}

export function wearSpot(panel: HTMLElement, spot: FloatingSpot, anchor: AnchorBox, frame: LaidFrame = VIEWPORT_FRAME): void {
	panel.style.left = `${(spot.left - frame.left) / frame.scale}px`;
	panel.style.top = `${(spot.top - frame.top) / frame.scale}px`;
	const pivot = pivotOf(anchor);
	panel.style.setProperty("--pop-origin", `${(pivot.x - spot.left) / frame.scale}px ${(pivot.y - spot.top) / frame.scale}px`);
	panel.style.setProperty("--pop-available-width", `${Math.round(spot.availableWidth / frame.scale)}px`);
	panel.style.setProperty("--pop-available-height", `${Math.round(spot.availableHeight / frame.scale)}px`);
	panel.dataset["side"] = spot.side;
	panel.dataset["align"] = spot.align;
}
