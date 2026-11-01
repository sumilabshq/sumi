import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";

export type TaskPageLayout = "wide" | "chips" | "narrow";

export const CHIPS_TASK_PAGE_PX = 880;
export const NARROW_TASK_PAGE_PX = 720;

export function useTaskPageLayout(ref: RefObject<HTMLElement | null>): TaskPageLayout {
	const [layout, setLayout] = useState<TaskPageLayout>("wide");
	useLayoutEffect(() => {
		const node = ref.current;

		if (node === null) {
			return;
		}

		const measure = (): void => setLayout(layoutOf(node.clientWidth));
		measure();
		const watch = new ResizeObserver(measure);
		watch.observe(node);
		return () => watch.disconnect();
	}, [ref]);
	return layout;
}

function layoutOf(widthPx: number): TaskPageLayout {
	if (widthPx === 0 || widthPx > CHIPS_TASK_PAGE_PX) {
		return "wide";
	}

	return widthPx > NARROW_TASK_PAGE_PX ? "chips" : "narrow";
}
