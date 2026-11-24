import type { CSSProperties } from "react";
import type { Frame } from "@sumi/flow-strip-plugin";

type CustomProperties = Readonly<Record<`--${string}`, string>>;
type PagePlace = CSSProperties & CustomProperties;

const ROW_HEIGHT = "calc(var(--h-sm) + var(--space-1))";
const PANEL_CORNER = "var(--r-page)";
const SQUARE_CORNER = "0px";
const EDGE_TOLERANCE = 1e-6;

export function rowPlaceOf(frame: Frame): CSSProperties {
	return {
		left: percentOf(frame.left),
		top: percentOf(frame.top),
		width: percentOf(frame.width),
		height: ROW_HEIGHT,
	};
}

export function pagePlaceOf(frame: Frame, hasRow: boolean): PagePlace {
	const rowTop = hasRow ? ` + ${ROW_HEIGHT}` : "";
	const rowSpace = hasRow ? ` - ${ROW_HEIGHT}` : "";
	return {
		left: percentOf(frame.left),
		top: `calc(${frame.top * 100}%${rowTop})`,
		width: percentOf(frame.width),
		height: `calc(${frame.height * 100}%${rowSpace})`,
		...panelCornersOf(frame),
	};
}

function panelCornersOf(frame: Frame): CustomProperties {
	const isTop = isNear(frame.top, 0);
	const isLeft = isNear(frame.left, 0);
	const isRight = isNear(frame.left + frame.width, 1);
	const isBottom = isNear(frame.top + frame.height, 1);
	return {
		"--plate-top-left-radius": cornerOf(isTop && isLeft),
		"--plate-top-right-radius": cornerOf(isTop && isRight),
		"--plate-bottom-right-radius": cornerOf(isBottom && isRight),
		"--plate-bottom-left-radius": cornerOf(isBottom && isLeft),
	};
}

function cornerOf(isPanelCorner: boolean): string {
	return isPanelCorner ? PANEL_CORNER : SQUARE_CORNER;
}

function isNear(value: number, target: number): boolean {
	return Math.abs(value - target) < EDGE_TOLERANCE;
}

function percentOf(share: number): string {
	return `${share * 100}%`;
}
