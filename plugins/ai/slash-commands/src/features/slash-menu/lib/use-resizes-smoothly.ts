import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

const RESIZE_MS = 180;
const RESIZE_EASING = "cubic-bezier(0.2, 0, 0, 1)";

export function useResizesSmoothly(panel: RefObject<HTMLElement | null>, isLeaving: boolean, onGone: () => void): void {
	const shownHeight = useRef(0);
	useLayoutEffect(() => {
		const node = panel.current;

		if (node === null) {
			return undefined;
		}

		const from = node.getAnimations().length > 0 ? node.getBoundingClientRect().height : shownHeight.current;
		node.getAnimations().forEach((running) => running.cancel());
		const to = isLeaving ? 0 : node.getBoundingClientRect().height;
		shownHeight.current = to;

		if (from === to || typeof node.animate !== "function" || matchMedia("(prefers-reduced-motion: reduce)").matches) {
			if (isLeaving) {
				onGone();
			}

			return undefined;
		}

		const resize = node.animate(
			[
				{
					height: `${from}px`,
					opacity: from === 0 ? 0 : 1,
				},
				{
					height: `${to}px`,
					opacity: to === 0 ? 0 : 1,
				},
			],
			{
				duration: RESIZE_MS,
				easing: RESIZE_EASING,
				fill: isLeaving ? "forwards" : "none",
			},
		);

		if (isLeaving) {
			resize.onfinish = onGone;
		}

		return undefined;
	});
}
