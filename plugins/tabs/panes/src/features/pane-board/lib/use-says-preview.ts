import { useEffect } from "react";
import type { RefObject } from "react";
import type { PaneRect } from "./pane-layout.js";

export function useSaysPreview(
	board: RefObject<HTMLElement | null>,
	preview: PaneRect | undefined,
	movingId: string | null,
): void {
	const key = preview === undefined ? "none" : `${preview.left},${preview.top} ${preview.width}×${preview.height}`;
	useEffect(() => {
		if (preview === undefined) {
			console.info(`[widgetarium] pane preview → none`);
			return;
		}

		const frame = requestAnimationFrame(() => {
			const origin = board.current?.getBoundingClientRect() ?? new DOMRect();
			const x = origin.left + preview.left + preview.width / 2;
			const y = origin.top + preview.top + preview.height / 2;
			console.info(
				`[widgetarium] pane preview → ${key}, moving ${movingId ?? "none"}, on top at its centre: ${elementSaid(document.elementFromPoint(x, y))}`,
			);
		});
		return () => cancelAnimationFrame(frame);
	}, [key]);
}

function elementSaid(element: Element | null): string {
	if (element === null) {
		return "nothing";
	}

	const classes = [...element.classList].join(".");
	return classes === "" ? element.tagName.toLowerCase() : `${element.tagName.toLowerCase()}.${classes}`;
}
