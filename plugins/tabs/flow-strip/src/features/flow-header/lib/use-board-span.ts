import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import { BOARD_ATTRIBUTE } from "../../../shared/lib/pane-dom.js";

export interface BoardSpan {
	readonly left: number;
	readonly width: number;
	readonly reach: number;
}

export function useBoardSpan(origin: RefObject<HTMLElement | null>): BoardSpan | null {
	const [span, setSpan] = useState<BoardSpan | null>(null);
	useLayoutEffect(() => {
		const read = (): void => setSpan((was) => keptSpan(was, spanOf(origin.current)));
		read();
		const board = document.querySelector(`[${BOARD_ATTRIBUTE}]`);
		const watch = new ResizeObserver(read);

		if (origin.current !== null) {
			watch.observe(origin.current);
		}

		if (board !== null) {
			watch.observe(board);
		}

		return () => watch.disconnect();
	});
	return span;
}

function spanOf(origin: HTMLElement | null): BoardSpan | null {
	const board = document.querySelector(`[${BOARD_ATTRIBUTE}]`);

	if (origin === null || board === null) {
		return null;
	}

	const own = origin.getBoundingClientRect();
	const there = board.getBoundingClientRect();
	return {
		left: there.left - own.left,
		width: there.width,
		reach: own.width,
	};
}

function keptSpan(was: BoardSpan | null, now: BoardSpan | null): BoardSpan | null {
	const isSame = was?.left === now?.left && was?.width === now?.width && was?.reach === now?.reach;
	return isSame ? was : now;
}
