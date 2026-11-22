import { useEffect, useLayoutEffect, useState } from "react";
import type { RefObject, WheelEvent } from "react";

export interface Across {
	readonly isMoreBefore: boolean;
	readonly isMoreAfter: boolean;
	readonly onScroll: () => void;
	readonly onWheel: (event: WheelEvent<HTMLDivElement>) => void;
	readonly pageBack: () => void;
	readonly pageOn: () => void;
}

const PAGE_SHARE = 0.8;
const EDGE_PX = 1;

export function useOverflowsAcross(track: RefObject<HTMLDivElement | null>, count: number): Across {
	const [shape, setShape] = useState({
		isMoreBefore: false,
		isMoreAfter: false,
	});
	const measure = (): void => {
		const held = track.current;

		if (held === null) {
			return;
		}

		const isMoreBefore = held.scrollLeft > EDGE_PX;
		const isMoreAfter = held.scrollLeft + held.clientWidth < held.scrollWidth - EDGE_PX;
		setShape((was) =>
			was.isMoreBefore === isMoreBefore && was.isMoreAfter === isMoreAfter
				? was
				: {
						isMoreBefore,
						isMoreAfter,
					},
		);
	};
	const pageBy = (share: number): void =>
		track.current?.scrollBy({
			left: track.current.clientWidth * share,
			behavior: "smooth",
		});
	useLayoutEffect(measure, [count]);
	useEffect(() => {
		const held = track.current;

		if (held === null || typeof ResizeObserver !== "function") {
			return undefined;
		}

		const sizes = new ResizeObserver(measure);
		sizes.observe(held);
		return () => sizes.disconnect();
	}, [track]);
	return {
		...shape,
		onScroll: measure,
		onWheel: (event) => {
			const held = track.current;

			if (held === null || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) {
				return;
			}

			held.scrollLeft += event.deltaY;
		},
		pageBack: () => pageBy(-PAGE_SHARE),
		pageOn: () => pageBy(PAGE_SHARE),
	};
}
