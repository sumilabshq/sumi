import { useLayoutEffect } from "react";
import type { RefObject } from "react";
import { SHELL_FRAME } from "./shell-frame.js";

const RIGHT_SIDE_WIDTH_VAR = "--wg-shell-right";

export function useWritesRightSideWidth(side: RefObject<HTMLElement | null>): void {
	useLayoutEffect(() => {
		const element = side.current;
		const frame = element?.closest<HTMLElement>(SHELL_FRAME) ?? null;
		const column = element?.parentElement ?? null;

		if (element === null || frame === null || column === null) {
			return;
		}

		return writeWidthOnResize(element, frame, column);
	}, [side]);
}

function writeWidthOnResize(element: HTMLElement, frame: HTMLElement, column: HTMLElement): () => void {
	const write = (): void => {
		frame.style.setProperty(RIGHT_SIDE_WIDTH_VAR, `${element.offsetWidth}px`);
		column.dataset["sized"] = "";
	};
	const watched = new ResizeObserver(write);
	write();
	watched.observe(element);
	return () => watched.disconnect();
}
