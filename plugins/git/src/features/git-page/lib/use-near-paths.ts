import { useEffect, useState } from "react";

const NEAR_MARGIN_PX = 800;
const PATH_SELECTOR = "[data-path]";

export function useNearPaths(scroller: HTMLElement | null, list: HTMLElement | null): ReadonlySet<string> {
	const [near, setNear] = useState<ReadonlySet<string>>(new Set());
	useEffect(() => {
		if (scroller === null || list === null) {
			return undefined;
		}

		let frame = 0;
		let listHeight = -1;
		const scan = (): void => {
			frame = 0;
			setNear((was) => withNearPaths(was, scroller));
		};
		const scanSoon = (): void => {
			if (frame === 0) {
				frame = requestAnimationFrame(scan);
			}
		};
		const watcher = new ResizeObserver(() => {
			if (list.offsetHeight === listHeight) {
				return;
			}

			listHeight = list.offsetHeight;
			scanSoon();
		});
		watcher.observe(list);
		scroller.addEventListener("scroll", scanSoon, { passive: true });
		scanSoon();
		return () => {
			watcher.disconnect();
			scroller.removeEventListener("scroll", scanSoon);
			cancelAnimationFrame(frame);
		};
	}, [scroller, list]);
	return near;
}

function withNearPaths(was: ReadonlySet<string>, scroller: HTMLElement): ReadonlySet<string> {
	const view = scroller.getBoundingClientRect();

	if (view.height === 0) {
		return was;
	}

	const near = [...scroller.querySelectorAll<HTMLElement>(PATH_SELECTOR)]
		.filter((section) => isNear(section.getBoundingClientRect(), view))
		.map((section) => section.dataset["path"] ?? "");

	if (near.length === was.size && near.every((path) => was.has(path))) {
		return was;
	}

	return new Set(near);
}

function isNear(box: DOMRect, view: DOMRect): boolean {
	return box.top < view.bottom + NEAR_MARGIN_PX && box.bottom > view.top - NEAR_MARGIN_PX;
}
