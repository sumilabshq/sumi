import type { Drawing } from "../../../shared/schema/drawing.schema.js";
import type { LayersPanel } from "../../../shared/schema/layer-row.schema.js";
import type { CanvasMoment } from "../../../shared/lib/view/canvas-moment.js";
import { DESKTOP_FRAME } from "../../../shared/lib/field/desktop-frame.js";
import { pickedMarkOf } from "../../../shared/lib/layers/picked-mark.js";
import type { ShownScreen } from "../../../shared/lib/layers/shown-screen.js";
import { layerRowsOf } from "./layer-rows.js";

export const NOT_DRAWN: LayersPanel = {
	isDrawn: false,
	isShown: false,
	isLocked: true,
	hasPicture: false,
	treeKey: "",
	picked: null,
	liveCopy: null,
	liveWidthPx: DESKTOP_FRAME.width,
	rows: [],
};

export function layersPanelOf(shown: ShownScreen, moment: CanvasMoment, registry: Drawing["registry"]): LayersPanel {
	const { isLayersOpen, isLayoutLocked, seenLayers, closedLayers } = moment;
	const seen = seenLayers[shown.key] ?? null;
	const picked = pickedMarkOf(moment, shown.picture ? [shown.picture.widget] : []);
	return {
		isDrawn: true,
		isShown: isLayersOpen && (seen !== null || shown.picture === null),
		isLocked: isLayoutLocked,
		hasPicture: shown.picture !== null,
		treeKey: `tree:${shown.screen.name}:${seen !== null}`,
		picked,
		liveCopy: liveCopyOf(shown, moment, seen !== null),
		liveWidthPx: DESKTOP_FRAME.width,
		rows: layerRowsOf(seen ?? [], {
			registry,
			picked,
			closed: new Set(closedLayers),
			isLocked: isLayoutLocked,
		}),
	};
}

function liveCopyOf(
	shown: ShownScreen,
	{ isLayersOpen, mode }: CanvasMoment,
	isSeen: boolean,
): LayersPanel["liveCopy"] {
	return isLayersOpen || mode === "pointer" || !isSeen ? shown.picture : null;
}
