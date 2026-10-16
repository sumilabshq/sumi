import { handler } from "@widgetarium/core/requests";
import { CanvasHost } from "../../adapters/canvas-host/canvas-host.adapter.js";
import { DesignDrawing } from "../../adapters/design-drawing/design-drawing.adapter.js";
import { DesignReads } from "../../lib/design/design-reads.js";
import { regionsOf } from "../../lib/field/regions-of.js";
import { pickIn } from "../../lib/layers/pick.js";
import { pickedMarkOf } from "../../lib/layers/picked-mark.js";
import { pictureWidgetsShownOf } from "../../lib/layers/shown-screen.js";
import { pagesNow, watchPages } from "../../lib/pages/pages-now.js";
import { CanvasStore } from "../../lib/view/canvas-store.js";
import { DrawingQuery, FieldRegionsQuery, FieldStateQuery, PickSpotCommand, ResolveSpotCommand } from "./contract.js";

const FIELD_STATE_FIELDS = ["mode", "renderer", "selection", "focusedWidget"] as const;

export const drawingHandler = handler(DrawingQuery, {
	inject: { designDrawing: DesignDrawing },
	run: (_input, { designDrawing }) => designDrawing.drawing(),
});

export const fieldRegionsHandler = handler(FieldRegionsQuery, {
	inject: { designReads: DesignReads, designDrawing: DesignDrawing, canvasStore: CanvasStore },
	run: async (_input, { designReads, designDrawing, canvasStore }) => ({
		regions: regionsOf(await pagesNow(designReads, canvasStore), designDrawing.drawing()),
	}),
	watch: (_input, { designReads, canvasStore }, changed) => watchPages(designReads, canvasStore, changed),
});

export const fieldStateHandler = handler(FieldStateQuery, {
	inject: { designReads: DesignReads, canvasStore: CanvasStore, canvasHost: CanvasHost },
	run: async (_input, { designReads, canvasStore, canvasHost }) => {
		const read = await pagesNow(designReads, canvasStore);
		const moment = canvasStore.now();
		const { mode, renderer, selection, focusedWidget } = moment;
		return {
			page: read.pages.shown,
			isPointer: mode === "pointer",
			flyTo: focusedWidget,
			pickedMark: pickedMarkOf(moment, pictureWidgetsShownOf(read)),
			pickedSpot: selection?.spot ?? null,
			unresolved: selection && selection.spot === null ? { widget: selection.widget, mark: selection.mark } : null,
			gpu: renderer === "gpu" ? canvasHost.gpu : null,
		};
	},
	watch: (_input, { designReads, canvasStore }, changed) =>
		watchPages(designReads, canvasStore, changed, FIELD_STATE_FIELDS),
});

export const pickSpotHandler = handler(PickSpotCommand, {
	inject: { canvasStore: CanvasStore },
	run: ({ selection }, { canvasStore }) => pickIn(canvasStore, selection),
});

export const resolveSpotHandler = handler(ResolveSpotCommand, {
	inject: { canvasStore: CanvasStore },
	run: ({ spot }, { canvasStore }) => {
		const { selection } = canvasStore.now();
		if (selection?.mark !== spot.mark) return canvasStore.unchanged(`the spot of ${spot.mark}: the pick moved on`);
		canvasStore.change({ selection: { ...selection, spot } }, `found ${spot.mark} on the canvas`);
	},
});
