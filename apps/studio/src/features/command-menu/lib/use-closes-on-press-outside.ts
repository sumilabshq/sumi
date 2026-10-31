import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { MENU_DOOR_SELECTOR } from "./menu-door-mark.js";

const OPENED_FROM_MENU = ".wg-kit-pop, .wg-kit-tooltip";

export function useClosesOnPressOutside(close: () => void): RefObject<HTMLDivElement | null> {
	const panel = useRef<HTMLDivElement>(null);
	const latestClose = useRef(close);
	latestClose.current = close;
	useEffect(() => {
		const closeUnlessInside = (event: PointerEvent): void => {
			const target = event.target;

			if (!(target instanceof Element)) {
				return;
			}

			if (
				panel.current?.contains(target) === true ||
				target.closest(MENU_DOOR_SELECTOR) !== null ||
				target.closest(OPENED_FROM_MENU) !== null
			) {
				return;
			}

			latestClose.current();
		};
		window.addEventListener("pointerdown", closeUnlessInside, true);
		return () => window.removeEventListener("pointerdown", closeUnlessInside, true);
	}, []);
	return panel;
}
