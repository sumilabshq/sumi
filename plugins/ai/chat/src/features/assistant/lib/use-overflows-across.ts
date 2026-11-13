import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

export interface Across {
	readonly overflows: boolean;
	readonly seen: number;
	readonly onScroll: () => void;
	readonly pageOn: () => void;
}

const PAGE_SHARE = 0.8;

export function useOverflowsAcross(track: RefObject<HTMLDivElement | null>, count: number): Across {
	const [shape, setShape] = useState({ overflows: false, seen: 1 });
	const measure = (): void => {
		const held = track.current;

		if (held === null) {
			return;
		}

		const overflows = held.scrollWidth > held.clientWidth + 1;
		const seen = overflows ? (held.scrollLeft + held.clientWidth) / held.scrollWidth : 1;
		setShape((was) => (was.overflows === overflows && was.seen === seen ? was : { overflows, seen }));
	};
	useLayoutEffect(measure, [count]);
	return {
		...shape,
		onScroll: measure,
		pageOn: () => track.current?.scrollBy({ left: track.current.clientWidth * PAGE_SHARE, behavior: "smooth" }),
	};
}
