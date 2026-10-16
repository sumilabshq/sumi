import { movedNode } from "@widgetarium/core/engine/node-moves.js";
import { handler, refuse } from "@widgetarium/core/requests";
import { WidgetDrawingGateway } from "../../gateways/widget-drawing/widget-drawing.gateway.js";
import { DesignFilesGateway } from "../../gateways/design-files/design-files.gateway.js";
import { DesignReads } from "../../shared/lib/design/design-reads.js";
import { layerMoveTo } from "./lib/layer-moves.js";
import { NOT_DRAWN, layersPanelOf } from "./lib/layers-panel.js";
import { pickIn } from "../../shared/lib/layers/pick.js";
import { pickedMarkOf } from "../../shared/lib/layers/picked-mark.js";
import { shownScreenOf } from "../../shared/lib/layers/shown-screen.js";
import { COMPONENTS_PAGE } from "../../shared/schema/canvas-page.schema.js";
import type { LayerMove } from "../../shared/schema/layer-move.schema.js";
import { pagesNow, watchPages } from "../../shared/lib/pages/pages-now.js";
import { pagesStill } from "../../shared/lib/pages/pages-still.js";
import { CanvasStore } from "../../shared/lib/view/canvas-store.js";
import {
	KeepSeenLayersCommand,
	LayersPanelQuery,
	LayersToggleQuery,
	MoveLayerCommand,
	PickLayerCommand,
	ToggleLayerFoldCommand,
	ToggleLayersCommand,
	ToggleLayoutLockCommand,
} from "./contract.js";
import { CanvasClientModule } from "../../module.js";

const NOT_MOVABLE = "That place is outside the page's own code, so nothing was moved.";
const NOT_A_PAGE = "This screen is not drawn by a page widget, so its layers cannot be moved.";
const NOT_A_PICKABLE_PAGE = "This screen is not drawn by a page widget, so a layer of it cannot be picked.";
const NOT_MOVED = "Nothing was moved: {why}";
const NO_PAGE_FOLDER = "{widget} has no folder here, so its layout cannot be changed.";
const PANEL_FIELDS = ["isLayersOpen", "isLayoutLocked", "mode", "selection", "seenLayers", "closedLayers"] as const;
export const KeepSeenLayersCommandHandler = handler(KeepSeenLayersCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle(({ key, layers }, { canvasStore }) => {
		const seenLayers = { ...canvasStore.now().seenLayers, [key]: layers };
		canvasStore.change({ seenLayers }, `read the layers of ${key}`);
	});

export const LayersPanelQueryHandler = handler(LayersPanelQuery, CanvasClientModule)
	.inject({ designReads: DesignReads, widgetDrawingGateway: WidgetDrawingGateway, canvasStore: CanvasStore })
	.watch((_input, { designReads, canvasStore }, changed) => watchPages(designReads, canvasStore, changed, PANEL_FIELDS))
	.handle(async (_input, { designReads, widgetDrawingGateway, canvasStore }) => {
		const shown = shownScreenOf(await pagesNow(designReads, canvasStore));
		if (!shown) return NOT_DRAWN;
		return layersPanelOf(shown, canvasStore.now(), widgetDrawingGateway.drawing().registry);
	});

export const LayersToggleQueryHandler = handler(LayersToggleQuery, CanvasClientModule)
	.inject({ designReads: DesignReads, canvasStore: CanvasStore })
	.watch((_input, { designReads, canvasStore }, changed) =>
		watchPages(designReads, canvasStore, changed, ["isLayersOpen"]),
	)
	.handle(async (_input, { designReads, canvasStore }) => {
		const { pages } = await pagesNow(designReads, canvasStore);
		return { isShown: pages.shown !== COMPONENTS_PAGE, isOpen: canvasStore.now().isLayersOpen };
	});

export const MoveLayerCommandHandler = handler(MoveLayerCommand, CanvasClientModule)
	.inject({
		designReads: DesignReads,
		designFilesGateway: DesignFilesGateway,
		widgetDrawingGateway: WidgetDrawingGateway,
		canvasStore: CanvasStore,
	})
	.handle(
		async ({ dragged, parent, before }, { designReads, designFilesGateway, widgetDrawingGateway, canvasStore }) => {
			const now = await pagesStill(designReads, canvasStore, `move ${dragged}`);
			if (!now) return;
			const widget = shownScreenOf(now)?.picture?.widget;
			if (!widget) return refuse(NOT_A_PAGE);
			const move = layerMoveTo(dragged, parent, before);
			if (!move) return refuse(NOT_MOVABLE);
			const folder = widgetDrawingGateway.drawing().registry.get(widget)?.folder;
			if (!folder) return refuse(NO_PAGE_FOLDER.replace("{widget}", widget));
			await designFilesGateway.changeText(`${folder}/${move.file}`, (source) => sourceMoved(source, move));
			designReads.changed(now.app);
		},
	);

export const PickLayerCommandHandler = handler(PickLayerCommand, CanvasClientModule)
	.inject({ designReads: DesignReads, canvasStore: CanvasStore })
	.handle(async ({ id }, { designReads, canvasStore }) => {
		const now = await pagesStill(designReads, canvasStore, `pick ${id}`);
		if (!now) return;
		const widget = shownScreenOf(now)?.picture?.widget;
		if (!widget) return refuse(NOT_A_PICKABLE_PAGE);
		const isPicked = pickedMarkOf(canvasStore.now(), [widget]) === id;
		pickIn(canvasStore, isPicked ? null : { widget, mark: id, spot: null });
	});

export const ToggleLayerFoldCommandHandler = handler(ToggleLayerFoldCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle(({ id }, { canvasStore }) => {
		const closed = canvasStore.now().closedLayers;
		const closedLayers = closed.includes(id) ? closed.filter((mark) => mark !== id) : [...closed, id];
		canvasStore.change({ closedLayers }, `fold ${id}`);
	});

export const ToggleLayersCommandHandler = handler(ToggleLayersCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle((_input, { canvasStore }) => {
		canvasStore.changeOpening({ isLayersOpen: !canvasStore.now().isLayersOpen }, "toggle layers");
	});

export const ToggleLayoutLockCommandHandler = handler(ToggleLayoutLockCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle((_input, { canvasStore }) => {
		const isLayoutLocked = !canvasStore.now().isLayoutLocked;
		canvasStore.change({ isLayoutLocked }, isLayoutLocked ? "lock the layout" : "unlock the layout");
	});

export function sourceMoved(source: string, move: LayerMove): string {
	const moved = movedNode(source, move);
	if ("refusal" in moved) return refuse(NOT_MOVED.replace("{why}", moved.refusal));
	return moved.source;
}
