import { useLayoutEffect, useRef, useState } from "react";
import type { RefObject } from "react";

export interface TitleReach {
	readonly ref: RefObject<HTMLDivElement | null>;
	readonly widthPx: number | undefined;
}

export function useTitleReach(edgePx: number | null): TitleReach {
	const ref = useRef<HTMLDivElement>(null);
	const [leftPx, setLeftPx] = useState(0);
	useLayoutEffect(() => {
		const row = ref.current?.parentElement;

		if (!row) {
			return;
		}

		const measure = (): void => setLeftPx(row.getBoundingClientRect().left);
		measure();
		const watch = new ResizeObserver(measure);
		watch.observe(row);
		return () => watch.disconnect();
	}, []);
	return { ref, widthPx: edgePx === null ? undefined : Math.max(edgePx - leftPx, 0) };
}
