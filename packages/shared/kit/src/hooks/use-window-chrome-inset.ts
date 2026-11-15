import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

export type ControlSpaceSide = "start" | "end";

const CHROME_VAR: Record<ControlSpaceSide, string> = {
	start: "--wg-shell-chrome-left",
	end: "--wg-shell-chrome-right",
};
const TOP_ROW_PX = 20;

export function useWindowChromeInset(space: RefObject<HTMLElement | null>, side: ControlSpaceSide): number {
	const [inset, setInset] = useState(0);

	useLayoutEffect(() => {
		const element = space.current;

		if (element === null) {
			return;
		}

		const measure = (): void => {
			setInset(chromeInsetOf(element, side));
		};
		const watcher = new ResizeObserver(measure);
		watcher.observe(element);
		watcher.observe(document.documentElement);
		window.addEventListener("resize", measure);
		measure();
		return () => {
			watcher.disconnect();
			window.removeEventListener("resize", measure);
		};
	}, [space, side]);

	return inset;
}

function chromeInsetOf(element: HTMLElement, side: ControlSpaceSide): number {
	const chrome = Number.parseFloat(getComputedStyle(element).getPropertyValue(CHROME_VAR[side]));
	const box = element.getBoundingClientRect();

	if (!Number.isFinite(chrome) || chrome <= 0 || box.top > TOP_ROW_PX) {
		return 0;
	}

	const fromEdge = side === "start" ? box.left : window.innerWidth - box.right;
	return Math.max(0, chrome - fromEdge);
}
