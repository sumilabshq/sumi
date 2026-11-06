import type { RefObject } from "react";
import type { EdgeSide } from "./edge-intent.js";
import type { ViewPoint } from "./edge-zones.js";

export type EdgeLook = "fixed" | "tucked" | "out";

export type ReadCursor = () => Promise<ViewPoint | null>;

export interface EdgeRevealAsk {
	readonly frame: RefObject<HTMLElement | null>;
	readonly content: RefObject<HTMLElement | null>;
	readonly panels: Readonly<Record<EdgeSide, RefObject<HTMLElement | null>>>;
	readonly sides: Readonly<Record<EdgeSide, EdgeLook>>;
	readonly reveal: (side: EdgeSide) => void;
	readonly conceal: (side: EdgeSide) => void;
	readonly readCursor: ReadCursor;
}

export function revealIfTucked(ask: EdgeRevealAsk, side: EdgeSide | null): void {
	if (side === null || ask.sides[side] !== "tucked") {
		return;
	}

	ask.reveal(side);
}
