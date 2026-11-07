import { useEffect, useRef } from "react";
import type { RefObject } from "react";
import { OPENS_LAYER_SELECTOR } from "@sumi/sumi-host-plugin";

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
				target.closest(OPENS_LAYER_SELECTOR) !== null ||
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
