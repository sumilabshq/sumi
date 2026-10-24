import { handler } from "@widgetarium/core/requests";
import { CanvasHost } from "../../gateways/canvas-host/canvas-host.gateway.js";
import { WidgetDrawingGateway } from "../../gateways/widget-drawing/widget-drawing.gateway.js";
import { DesignReads } from "../../shared/lib/design/design-reads.js";
import { regionsOf } from "./lib/regions-of.js";
import { pickIn } from "../../shared/lib/layers/pick.js";
import { pickedMarkOf } from "../../shared/lib/layers/picked-mark.js";
import { pictureWidgetsShownOf } from "../../shared/lib/layers/shown-screen.js";
import { pagesNow, watchPages } from "../../shared/lib/pages/pages-now.js";
import { CanvasStore } from "../../shared/lib/view/canvas-store.js";
import { DrawingQuery, FieldRegionsQuery, FieldStateQuery, PickSpotCommand, ResolveSpotCommand } from "./contract.js";
import { CanvasClientModule } from "../../module.js";

const FIELD_STATE_FIELDS = ["mode", "selection", "focusedWidget"] as const;

export const DrawingQueryHandler = handler(DrawingQuery, CanvasClientModule)
	.inject({ widgetDrawingGateway: WidgetDrawingGateway })
	.handle((_input, { widgetDrawingGateway }) => widgetDrawingGateway.drawing());

export const FieldRegionsQueryHandler = handler(FieldRegionsQuery, CanvasClientModule)
	.inject({ designReads: DesignReads, widgetDrawingGateway: WidgetDrawingGateway, canvasStore: CanvasStore })
	.watch((_input, { designReads, canvasStore }, changed) => watchPages(designReads, canvasStore, changed))
	.handle(async (_input, { designReads, widgetDrawingGateway, canvasStore }) => ({
		regions: regionsOf(await pagesNow(designReads, canvasStore), widgetDrawingGateway.drawing()),
	}));

export const FieldStateQueryHandler = handler(FieldStateQuery, CanvasClientModule)
	.inject({ designReads: DesignReads, canvasStore: CanvasStore, canvasHost: CanvasHost })
	.watch((_input, { designReads, canvasStore }, changed) =>
		watchPages(designReads, canvasStore, changed, FIELD_STATE_FIELDS),
	)
	.handle(async (_input, { designReads, canvasStore, canvasHost }) => {
		const read = await pagesNow(designReads, canvasStore);
		const moment = canvasStore.now();
		const { mode, selection, focusedWidget } = moment;
		return {
			page: read.pages.shown,
			isPointer: mode === "pointer",
			flyTo: focusedWidget,
			pickedMark: pickedMarkOf(moment, pictureWidgetsShownOf(read)),
			pickedSpot: selection?.spot ?? null,
			unresolved: selection && selection.spot === null ? { widget: selection.widget, mark: selection.mark } : null,
			gpu: canvasHost.gpu,
		};
	});

export const PickSpotCommandHandler = handler(PickSpotCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle(({ selection }, { canvasStore }) => pickIn(canvasStore, selection));

export const ResolveSpotCommandHandler = handler(ResolveSpotCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle(({ spot }, { canvasStore }) => {
		const { selection } = canvasStore.now();
		if (selection?.mark !== spot.mark) return canvasStore.unchanged(`the spot of ${spot.mark}: the pick moved on`);
		canvasStore.change({ selection: { ...selection, spot } }, `found ${spot.mark} on the canvas`);
	});
