import { SCALE_EASING, SCALE_FROM, SCALE_MS } from "../constants/popover";

export function wantsScale(panel: HTMLElement): boolean {
	return getComputedStyle(panel).getPropertyValue("--pop-motion").trim() === "scale";
}

export function scaleIn(panel: HTMLElement, origin: string): () => void {
	panel.style.transformOrigin = origin;
	const motion = scaling(panel);
	return () => motion?.cancel();
}

export function scaleOut(done: () => void): () => void {
	done();
	return () => undefined;
}

function scaling(panel: HTMLElement): Animation | undefined {
	if (typeof panel.animate !== "function") {
		return undefined;
	}

	return panel.animate(
		[
			{ opacity: 0, scale: `${SCALE_FROM}` },
			{ opacity: 1, scale: "1" },
		],
		{ duration: SCALE_MS, easing: SCALE_EASING, fill: "backwards" },
	);
}
