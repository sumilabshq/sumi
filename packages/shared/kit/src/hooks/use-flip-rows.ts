import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";

const FLIP_ITEM = "[data-sort-id]";
const FLIP_MS = 160;
const FLIP_EASE = "cubic-bezier(0.2, 0, 0, 1)";

export function useFlipRows(root: RefObject<HTMLElement | null>, rows: unknown): void {
	const tops = useRef<ReadonlyMap<string, number>>(new Map());
	useLayoutEffect(() => {
		const holder = root.current;

		if (holder === null) {
			return;
		}

		const now = new Map<string, number>();

		for (const row of holder.querySelectorAll<HTMLElement>(FLIP_ITEM)) {
			const id = row.getAttribute("data-sort-id") ?? "";
			const top = laidOutTopOf(row, holder);
			const was = tops.current.get(id);
			now.set(id, top);

			if (was === undefined || was === top) {
				continue;
			}

			const shown = shownOffsetOf(row);
			row.getAnimations().forEach((animation) => animation.cancel());
			row.animate([{ transform: `translateY(${was - top + shown}px)` }, { transform: "translateY(0)" }], {
				duration: FLIP_MS,
				easing: FLIP_EASE,
			});
		}

		tops.current = now;
	}, [root, rows]);
}

function laidOutTopOf(row: HTMLElement, holder: HTMLElement): number {
	let top = 0;
	let at: Element | null = row;

	while (at instanceof HTMLElement && at !== holder && holder.contains(at)) {
		top += at.offsetTop;
		at = at.offsetParent;
	}

	return top;
}

function shownOffsetOf(row: HTMLElement): number {
	const running = row.getAnimations().length > 0;

	if (!running) {
		return 0;
	}

	const { transform } = getComputedStyle(row);
	return transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m42;
}
