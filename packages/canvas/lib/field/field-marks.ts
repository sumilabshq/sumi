import type { LookRoom, PointingMarks } from "@widgetarium/behaviors";

export const LIVE_SCREEN = "data-wg-live-screen";

export const POINTING: PointingMarks = {
	frame: "data-canvas-frame",
	screen: "data-canvas-screen",
	liveScreen: LIVE_SCREEN,
	chrome: "[data-canvas-chrome]",
};

export const LOOK_ROOM: LookRoom = {
	top: 80,
	margin: 48,
	least: 0.6,
	most: 1,
	view: "[data-canvas-view]",
	coveredBy: "[data-canvas-layers='open']",
};

export const PRESSABLE = "button, input, textarea, [role=radio], [role=tab], [role=switch], [data-wg-job]";

export function groupSelectorOf(widget: string | null): string | null {
	return widget === null ? null : `[data-wg-group="${CSS.escape(widget)}"]`;
}
