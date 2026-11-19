import { useLayoutEffect, useState } from "react";
import type { RefObject } from "react";
import type { GridView } from "./grid-span.js";

const UNMEASURED: GridView = {
	width: 0,
	top: 0,
	height: 0,
};

export function useGridView(box: HTMLElement | null, grid: RefObject<HTMLElement | null>): GridView {
	const [view, setView] = useState(UNMEASURED);

	useLayoutEffect(() => {
		const own = grid.current;

		if (box === null || own === null) {
			return undefined;
		}

		let frame = 0;
		const measure = (): void => {
			frame = 0;
			setView((was) => sameOrNext(was, viewOf(box, own)));
		};
		const measureNextFrame = (): void => {
			if (frame === 0) {
				frame = window.requestAnimationFrame(measure);
			}
		};
		const watcher = new ResizeObserver(measureNextFrame);
		watcher.observe(box);
		watcher.observe(own);
		box.addEventListener("scroll", measureNextFrame, { passive: true });
		measure();
		return () => {
			window.cancelAnimationFrame(frame);
			watcher.disconnect();
			box.removeEventListener("scroll", measureNextFrame);
		};
	}, [box, grid]);

	return view;
}

function viewOf(box: HTMLElement, own: HTMLElement): GridView {
	return {
		width: own.clientWidth,
		top: box.getBoundingClientRect().top - own.getBoundingClientRect().top,
		height: box.clientHeight,
	};
}

function sameOrNext(was: GridView, next: GridView): GridView {
	const isHidden = next.width === 0;
	const isSame = was.width === next.width && was.top === next.top && was.height === next.height;
	return isHidden || isSame ? was : next;
}
