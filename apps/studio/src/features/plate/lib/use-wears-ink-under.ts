import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { INK_CLASSES } from "./wear-plate-look.js";

const PLATE_HEAD = "wg-plate-head";
const INK_CLASS_NAMES: readonly string[] = Object.values(INK_CLASSES);
const WATCHED: MutationObserverInit = {
	subtree: true,
	attributes: true,
	attributeFilter: ["class", "style"],
};

export function useWearsInkUnder(floating: RefObject<HTMLElement | null>): void {
	useLayoutEffect(() => {
		const own = floating.current;

		if (own === null) {
			return;
		}

		let frame = 0;
		const wear = (): void => {
			frame = 0;
			const head = plateHeadUnder(own);
			INK_CLASS_NAMES.forEach((ink) => own.classList.toggle(ink, head?.classList.contains(ink) ?? false));
		};
		const wearSoon = (): void => {
			if (frame === 0) {
				frame = requestAnimationFrame(wear);
			}
		};
		wear();
		const watched = new MutationObserver(wearSoon);
		watched.observe(own.ownerDocument.body, WATCHED);
		window.addEventListener("resize", wearSoon);
		return () => {
			watched.disconnect();
			window.removeEventListener("resize", wearSoon);
			cancelAnimationFrame(frame);
		};
	}, [floating]);
}

function plateHeadUnder(own: HTMLElement): Element | null {
	const box = own.getBoundingClientRect();
	const stacked = own.ownerDocument.elementsFromPoint(box.left + box.width / 2, box.top + box.height / 2);

	return stacked.find((element) => element.classList.contains(PLATE_HEAD)) ?? null;
}
