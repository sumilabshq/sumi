import { SCALE_EASING, SCALE_FROM, SCALE_MS } from "../constants/popover";

export function wantsScale(panel: HTMLElement): boolean {
	return getComputedStyle(panel).getPropertyValue("--pop-motion").trim() === "scale";
}

export function scaleIn(panel: HTMLElement): () => void {
	const motion = scaling(panel, "normal");
	return () => motion?.cancel();
}

export function scaleOut(panel: HTMLElement, done: () => void): () => void {
	const motion = scaling(panel, "reverse");
	const stop = (): void => motion?.cancel();

	if (motion === undefined) {
		done();
		return stop;
	}

	motion.onfinish = () => {
		done();
		stop();
	};
	return stop;
}

function scaling(panel: HTMLElement, direction: "normal" | "reverse"): Animation | undefined {
	if (typeof panel.animate !== "function") {
		return undefined;
	}

	return panel.animate([{ scale: `${SCALE_FROM}` }, { scale: "1" }], {
		duration: SCALE_MS,
		easing: SCALE_EASING,
		direction,
		fill: direction === "normal" ? "backwards" : "forwards",
	});
}
