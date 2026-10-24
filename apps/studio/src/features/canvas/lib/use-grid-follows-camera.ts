import { useEffect } from "react";
import type { RefObject } from "react";
import type { StageLook } from "@widgetarium/gpu";
import type { PanZoom } from "@widgetarium/behaviors";
import { boardGridOf } from "./board-grid.js";

export function useGridFollowsCamera(pan: PanZoom, fieldRef: RefObject<HTMLElement | null>): void {
	const { lookNow, watchLook } = pan;
	useEffect(() => {
		const paintGrid = (look: StageLook): void => paintGridOn(fieldRef.current, look);
		paintGrid(lookNow());
		return watchLook(paintGrid);
	}, [lookNow, watchLook, fieldRef]);
}

function paintGridOn(field: HTMLElement | null, look: StageLook): void {
	if (!field) {
		return;
	}

	const grid = boardGridOf(look);
	field.style.setProperty("--canvas-grid-pitch", `${grid.pitchPx}px`);
	field.style.setProperty("--canvas-grid-x", `${grid.xPx}px`);
	field.style.setProperty("--canvas-grid-y", `${grid.yPx}px`);
	field.style.setProperty("--canvas-grid-dot", `${grid.dotPx}px`);
}
