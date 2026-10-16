const PAGE_FADE_MS = 140;
const FADED_ON_TURN = "[data-canvas-layer], [data-canvas-layers='open']";
const TURNED_IN = "[data-canvas-view]";

export function fadedTurn(from: Element | null, turn: () => void): void {
	const view = from?.closest(TURNED_IN) ?? null;
	const shown = view ? [...view.querySelectorAll<HTMLElement>(FADED_ON_TURN)] : [];
	if (shown.length === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return turn();
	const outs = shown.map((element) =>
		element.animate([{ opacity: 1 }, { opacity: 0 }], { duration: PAGE_FADE_MS, easing: "ease-out", fill: "forwards" }),
	);
	void Promise.all(outs.map((out) => out.finished)).then(turn);
}
