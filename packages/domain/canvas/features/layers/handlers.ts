import { EdgeWidth } from "@widgetarium/behaviors";
import { handler, refuse } from "@widgetarium/core/requests";
import { WidgetDrawingGateway } from "../../gateways/widget-drawing/widget-drawing.gateway.js";
import { DesignFilesGateway } from "../../gateways/design-files/design-files.gateway.js";
import { DesignReads } from "../../shared/lib/design/design-reads.js";
import { layerMoveTo } from "./lib/layer-moves.js";
import { NOT_DRAWN, layersPanelOf } from "./lib/layers-panel.js";
import { pickIn } from "../../shared/lib/layers/pick.js";
import { pickedMarkOf } from "../../shared/lib/layers/picked-mark.js";
import { shownScreenOf } from "../../shared/lib/layers/shown-screen.js";
import { pagesNow, watchPages } from "../../shared/lib/pages/pages-now.js";
import { pagesStill } from "../../shared/lib/pages/pages-still.js";
import { CanvasStore } from "../../shared/lib/view/canvas-store.js";
import {
	KeepSeenLayersCommand,
	LayersPanelQuery,
	MoveLayerCommand,
	PickLayerCommand,
	ResetSidebarWidthCommand,
	ResizeSidebarWidthCommand,
	SidebarQuery,
	ToggleLayerFoldCommand,
	ToggleSidebarCommand,
	ToggleLayoutLockCommand,
} from "./contract.js";
import { CanvasClientModule } from "../../module.js";

const NOT_MOVABLE = "That place is outside the page's own code, so nothing was moved.";
const NOT_A_PAGE = "This screen is not drawn by a page widget, so its layers cannot be moved.";
const NOT_A_PICKABLE_PAGE = "This screen is not drawn by a page widget, so a layer of it cannot be picked.";
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
			const { sourceMoved } = await import("./lib/source-moved.js");
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

export const ResetSidebarWidthCommandHandler = handler(ResetSidebarWidthCommand, CanvasClientModule)
	.inject({ sidebarWidth: EdgeWidth })
	.handle((_input, { sidebarWidth }) => sidebarWidth.reset());

export const ResizeSidebarWidthCommandHandler = handler(ResizeSidebarWidthCommand, CanvasClientModule)
	.inject({ sidebarWidth: EdgeWidth })
	.handle(({ px, roomPx }, { sidebarWidth }) => sidebarWidth.resize(px, roomPx));

export const SidebarQueryHandler = handler(SidebarQuery, CanvasClientModule)
	.inject({ canvasStore: CanvasStore, sidebarWidth: EdgeWidth })
	.watch((_input, { canvasStore, sidebarWidth }, changed) => {
		const stopOpen = canvasStore.watch(["isLayersOpen"], changed);
		const stopWidth = sidebarWidth.subscribe(changed);
		return () => {
			stopOpen();
			stopWidth();
		};
	})
	.handle((_input, { canvasStore, sidebarWidth }) => ({
		isOpen: canvasStore.now().isLayersOpen,
		px: sidebarWidth.now(),
	}));

export const ToggleLayerFoldCommandHandler = handler(ToggleLayerFoldCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle(({ id }, { canvasStore }) => {
		const closed = canvasStore.now().closedLayers;
		const closedLayers = closed.includes(id) ? closed.filter((mark) => mark !== id) : [...closed, id];
		canvasStore.change({ closedLayers }, `fold ${id}`);
	});

export const ToggleSidebarCommandHandler = handler(ToggleSidebarCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle((_input, { canvasStore }) => {
		const isLayersOpen = !canvasStore.now().isLayersOpen;
		canvasStore.changeOpening({ isLayersOpen }, isLayersOpen ? "open the sidebar" : "close the sidebar");
	});

export const ToggleLayoutLockCommandHandler = handler(ToggleLayoutLockCommand, CanvasClientModule)
	.inject({ canvasStore: CanvasStore })
	.handle((_input, { canvasStore }) => {
		const isLayoutLocked = !canvasStore.now().isLayoutLocked;
		canvasStore.change({ isLayoutLocked }, isLayoutLocked ? "lock the layout" : "unlock the layout");
	});
