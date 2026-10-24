import { EdgeWidth, localPxMemory } from "@widgetarium/behaviors";
import type { EdgeBounds } from "@widgetarium/behaviors";

export const SIDEBAR_BOUNDS: EdgeBounds = {
	leastPx: 160,
	usualPx: 200,
	keptBesidePx: 320,
};

export const SIDEBAR_HAIRLINE_PX = 1;

const SIDEBAR_WIDTH_KEY = "widgetarium-canvas-sidebar-px";

export function createSidebarWidth(): EdgeWidth {
	return new EdgeWidth("canvas sidebar", SIDEBAR_BOUNDS, localPxMemory(SIDEBAR_WIDTH_KEY));
}
