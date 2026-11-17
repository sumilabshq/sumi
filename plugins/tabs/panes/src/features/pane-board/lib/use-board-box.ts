import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import type { PaneRect } from "./pane-layout.js";

const NOWHERE: PaneRect = {
	left: 0,
	top: 0,
	width: 0,
	height: 0,
};

export function useBoardBox(board: RefObject<HTMLElement | null>): PaneRect {
	const [box, setBox] = useState<PaneRect>(NOWHERE);
	useLayoutEffect(() => {
		const element = board.current;

		if (element === null) {
			return undefined;
		}

		const resized = new ResizeObserver(() => setBox(boxOf(element)));
		resized.observe(element);
		setBox(boxOf(element));
		return () => resized.disconnect();
	}, [board]);
	return box;
}

function boxOf(element: HTMLElement): PaneRect {
	return {
		left: 0,
		top: 0,
		width: element.clientWidth,
		height: element.clientHeight,
	};
}
