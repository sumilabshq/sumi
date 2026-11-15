import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

export function useKeepsHeightWhileHeld(isHeld: boolean): RefObject<HTMLDivElement | null> {
	const grid = useRef<HTMLDivElement | null>(null);
	useLayoutEffect(() => {
		const element = grid.current;

		if (element === null || !isHeld) {
			return undefined;
		}

		element.style.minHeight = `${element.offsetHeight}px`;
		return () => {
			element.style.minHeight = "";
		};
	}, [isHeld]);
	return grid;
}
