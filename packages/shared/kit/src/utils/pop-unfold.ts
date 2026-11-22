const UNFOLD_MS = 160;
const FADE_MS = 120;
const FADE_GAP_MS = 30;
const UNFOLD_EASING = "cubic-bezier(0.2, 0, 0, 1)";

interface BoxSize {
	readonly width: number;
	readonly height: number;
}

export function wantsUnfold(panel: HTMLElement): boolean {
	return getComputedStyle(panel).getPropertyValue("--pop-motion").trim() === "unfold";
}

export function unfoldIn(panel: HTMLElement): () => void {
	const motions = unfolding(panel, "normal");
	return () => motions.forEach((motion) => motion.cancel());
}

export function unfoldOut(panel: HTMLElement, done: () => void): () => void {
	const motions = unfolding(panel, "reverse");
	const stop = (): void => motions.forEach((motion) => motion.cancel());
	const frame = motions[0];

	if (frame === undefined) {
		done();
		return stop;
	}

	frame.onfinish = () => {
		done();
		stop();
	};
	return stop;
}

function unfolding(panel: HTMLElement, direction: "normal" | "reverse"): Animation[] {
	if (typeof panel.animate !== "function") {
		return [];
	}

	const isOpening = direction === "normal";
	const size = {
		width: panel.offsetWidth,
		height: panel.offsetHeight,
	};
	const radius = getComputedStyle(panel).borderRadius || "0px";
	const frame = panel.animate(
		[
			{
				clipPath: foldedClipOf(panel.style.getPropertyValue("--pop-origin"), size, radius),
				opacity: 1,
			},
			{
				clipPath: `inset(0px 0px 0px 0px round ${radius})`,
				opacity: 1,
			},
		],
		{
			duration: UNFOLD_MS,
			easing: UNFOLD_EASING,
			direction,
			fill: isOpening ? "backwards" : "forwards",
		},
	);
	const fade = panel.firstElementChild?.animate(
		[
			{
				opacity: 0,
			},
			{
				opacity: 1,
			},
		],
		{
			duration: FADE_MS,
			delay: isOpening ? FADE_GAP_MS : 0,
			endDelay: isOpening ? 0 : FADE_GAP_MS,
			easing: "ease-out",
			direction,
			fill: "both",
		},
	);
	return fade === undefined ? [frame] : [frame, fade];
}

function foldedClipOf(origin: string, size: BoxSize, radius: string): string {
	const [across, down] = origin.trim().split(/\s+/);
	const x = alongOf(across, size.width, "right");
	const y = alongOf(down, size.height, "bottom");
	return `inset(${y}px ${size.width - x}px ${size.height - y}px ${x}px round ${radius})`;
}

function alongOf(token: string | undefined, length: number, farEnd: string): number {
	if (token === farEnd) {
		return length;
	}

	if (token === "center") {
		return length / 2;
	}

	const px = Number.parseFloat(token ?? "");
	return Number.isFinite(px) ? Math.max(0, Math.min(length, px)) : 0;
}
