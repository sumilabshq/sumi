import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import { SHELL_FRAME } from "../../../shared/lib/shell-frame.js";

export interface SpotOverSide {
	readonly frame: HTMLElement;
	readonly left: number;
	readonly top: number;
}

export function useSpotOverSide(button: RefObject<HTMLElement | null>, isPeeking: boolean): SpotOverSide | null {
	const [spot, setSpot] = useState<SpotOverSide | null>(null);

	useLayoutEffect(() => {
		const element = button.current;
		const frame = isPeeking ? (element?.closest<HTMLElement>(SHELL_FRAME) ?? null) : null;

		if (element === null || frame === null) {
			setSpot(null);
			return;
		}

		return followSpot(element, frame, setSpot);
	}, [button, isPeeking]);

	return spot;
}

function followSpot(element: HTMLElement, frame: HTMLElement, setSpot: (spot: SpotOverSide) => void): () => void {
	let kept: SpotOverSide | null = null;
	let frameId = 0;
	const measure = (): void => {
		const next = spotOf(element, frame);

		if (kept === null || kept.left !== next.left || kept.top !== next.top) {
			kept = next;
			setSpot(next);
		}

		frameId = requestAnimationFrame(measure);
	};
	measure();
	return () => cancelAnimationFrame(frameId);
}

function spotOf(element: HTMLElement, frame: HTMLElement): SpotOverSide {
	const box = element.getBoundingClientRect();
	const frameBox = frame.getBoundingClientRect();
	return {
		frame,
		left: box.left - frameBox.left,
		top: box.top - frameBox.top,
	};
}
