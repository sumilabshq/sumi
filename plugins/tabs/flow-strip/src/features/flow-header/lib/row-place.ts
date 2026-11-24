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

	return {
		left: `calc(${span.left + frame.left * span.width}px + ${GUTTER})`,
		width: `calc(${frame.width * span.width}px - 2 * ${GUTTER})`,
	};
}
