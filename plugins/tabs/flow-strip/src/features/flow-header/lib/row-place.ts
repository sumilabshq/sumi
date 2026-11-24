import type { CSSProperties } from "react";
import type { Frame } from "../../../shared/lib/pane-rects.js";
import type { BoardSpan } from "./use-board-span.js";

const GUTTER = "var(--space-0-5)";

export function rowPlaceOf(frame: Frame, span: BoardSpan | null): CSSProperties {
	if (span === null) {
		return {
			left: `calc(${frame.left * 100}% + ${GUTTER})`,
			width: `calc(${frame.width * 100}% - 2 * ${GUTTER})`,
		};
	}

	const paneLeft = span.left + frame.left * span.width;
	const startPx = Math.max(paneLeft, 0);
	const endPx = Math.min(paneLeft + frame.width * span.width, span.reach);
	return {
		left: `calc(${startPx}px + ${GUTTER})`,
		width: `calc(${Math.max(endPx - startPx, 0)}px - 2 * ${GUTTER})`,
	};
}
