import type { CSSProperties } from "react";
import type { Frame } from "@sumi/flow-strip-plugin";

const GUTTER = "var(--space-0-5)";
const ROW_HEIGHT = "calc(var(--h-sm) + var(--space-1))";

export function rowPlaceOf(frame: Frame): CSSProperties {
	return {
		left: `calc(${frame.left * 100}% + ${GUTTER})`,
		top: `calc(${frame.top * 100}% + ${GUTTER})`,
		width: `calc(${frame.width * 100}% - 2 * ${GUTTER})`,
		height: "var(--h-sm)",
	};
}

export function pagePlaceOf(frame: Frame, hasRow: boolean): CSSProperties {
	const rowTop = hasRow ? ` + ${ROW_HEIGHT}` : "";
	const rowSpace = hasRow ? ` - ${ROW_HEIGHT}` : "";
	return {
		left: `calc(${frame.left * 100}% + ${GUTTER})`,
		top: `calc(${frame.top * 100}% + ${GUTTER}${rowTop})`,
		width: `calc(${frame.width * 100}% - 2 * ${GUTTER})`,
		height: `calc(${frame.height * 100}% - 2 * ${GUTTER}${rowSpace})`,
	};
}
