import { useEffect } from "react";
import type { RefObject } from "react";

const UNFOLDED_AFTER_MS = 220;

export function useScrolledToPicked(
	held: RefObject<HTMLDivElement | null>,
	picked: string | null,
	isShown: boolean,
	indent: number,
): void {
	useEffect(() => {
		if (!picked || !isShown) return;
		const timer = window.setTimeout(() => {
			const scroller = held.current;
			const row = scroller?.querySelector<HTMLElement>("[data-canvas-layer-row][data-picked]");
			if (!scroller || !row) return;
			const top = row.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop;
			scroller.scrollTo({
				top: top - scroller.clientHeight / 2 + row.offsetHeight / 2,
				left: Math.max(0, Number(row.dataset["depth"] ?? 0) - 1) * indent,
				behavior: "smooth",
			});
		}, UNFOLDED_AFTER_MS);
		return () => window.clearTimeout(timer);
	}, [held, picked, isShown, indent]);
}
