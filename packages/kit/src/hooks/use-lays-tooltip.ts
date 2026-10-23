import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import { layTooltip, tooltipPartsOf } from "../utils/tooltip-place";
import type { TooltipState } from "../utils/tooltip-pointing";

export interface TooltipRefs {
	readonly bubble: RefObject<HTMLDivElement | null>;
	readonly face: RefObject<HTMLSpanElement | null>;
	readonly arrow: RefObject<HTMLSpanElement | null>;
}

export function useLaysTooltip({ bubble, face, arrow }: TooltipRefs, state: TooltipState, isDrawn: boolean): void {
	const laidSerial = useRef(-1);
	useLayoutEffect(() => {
		const parts = tooltipPartsOf(bubble.current, face.current, arrow.current);
		if (parts === null || laidSerial.current === state.serial) {
			return;
		}

		laidSerial.current = state.serial;
		layTooltip(parts, state);
	}, [bubble, face, arrow, state, isDrawn]);
}
