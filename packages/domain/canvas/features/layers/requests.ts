import { PerCall, Repeatable, command, query, refuse, subscriber } from "@widgetarium/core/requests";
import { AgentJobsGateway } from "../../gateways/agent-jobs/agent-jobs.gateway.js";
import { JobsChangedEvent } from "../../gateways/agent-jobs/agent-jobs.events.js";
import { CanvasMomentChangedEvent } from "../../gateways/canvas-moment/canvas-moment.events.js";
import { CanvasMomentGateway } from "../../gateways/canvas-moment/canvas-moment.gateway.js";
import { DesignChangedEvent } from "../../gateways/design-folder/design-folder.events.js";
import { DesignFolderGateway } from "../../gateways/design-folder/design-folder.gateway.js";
import { DesignFilesGateway } from "../../gateways/design-files/design-files.gateway.js";
import { SidebarWidthGateway } from "../../gateways/sidebar-width/sidebar-width.gateway.js";
import { WidgetDrawingGateway } from "../../gateways/widget-drawing/widget-drawing.gateway.js";
import type { CanvasField } from "../../shared/schema/canvas-moment.schema.js";
import { LayersPanelSchema } from "../../shared/schema/layer-row.schema.js";
import { LayerIdSchema, LayerMoveAskSchema, SeenLayersSchema } from "../../shared/schema/layer.schema.js";
import { SidebarResizeSchema, SidebarSchema } from "../../shared/schema/sidebar.schema.js";
import { pickedChange } from "../../shared/lib/layers/picked-change.js";
import { pickedMarkOf } from "../../shared/lib/layers/picked-mark.js";
import { shownScreenOf } from "../../shared/lib/layers/shown-screen.js";
import { PAGE_FIELDS, pagesNowOf } from "../../shared/lib/pages/pages-now.js";
import { pageTurnWhileRead } from "../../shared/lib/pages/page-turn.js";
import { isTouching, momentWriteOf } from "../../shared/lib/view/canvas-moment.js";
import { SIDEBAR_BOUNDS, sidebarPxOf, sidebarPxWithin } from "../../shared/lib/view/sidebar-width.js";
import { layerMoveTo } from "./lib/layer-moves.js";
import { canDragLayer, layerIn } from "./lib/layer-drag.js";
import { NOT_DRAWN, layersPanelOf } from "./lib/layers-panel.js";

const NOT_MOVABLE = "That place is outside the page's own code, so nothing was moved.";
const NOT_A_PAGE = "This screen is not drawn by a page widget, so its layers cannot be moved.";
const NOT_A_PICKABLE_PAGE = "This screen is not drawn by a page widget, so a layer of it cannot be picked.";
const NOT_DRAGGABLE = "This layer is held, or the layout is locked, so it was not moved.";
const NO_PAGE_FOLDER = "{widget} has no folder here, so its layout cannot be changed.";
const PANEL_FIELDS: readonly CanvasField[] = [
	...PAGE_FIELDS,
	"isLayersOpen",
	"isLayoutLocked",
	"mode",
	"selection",
	"seenLayers",
	"closedLayers",
];

const PAGES_READ = {
	canvasMoment: CanvasMomentGateway,
	designFolder: DesignFolderGateway,
	agentJobs: AgentJobsGateway,
};

export const LayersPanelQuery = query("layers-panel")
	.output(LayersPanelSchema)
	.inject({
		...PAGES_READ,
		widgetDrawing: WidgetDrawingGateway,
	})
	.handle(async (_input, { canvasMoment, designFolder, agentJobs, widgetDrawing }) => {
		const moment = canvasMoment.moment();
		const now = pagesNowOf(moment, await designFolder.folder(moment.app), agentJobs.jobsOf(moment.app));
		const shown = shownScreenOf(now);

		if (!shown) {
			return NOT_DRAWN;
		}

		return layersPanelOf(shown, moment, widgetDrawing.drawing().registry);
	});

export const KeepSeenLayersCommand = command("keep-seen-layers")
	.input(SeenLayersSchema)
	.idempotencyKey(Repeatable)
	.inject({ canvasMoment: CanvasMomentGateway })
	.handle(({ key, layers }, { canvasMoment }) => {
		const moment = canvasMoment.moment();
		const seenLayers = {
			...moment.seenLayers,
			[key]: layers,
		};
		const write = momentWriteOf(moment, { seenLayers }, `read the layers of ${key}`);

		if (write !== null) {
			canvasMoment.saveMoment(write);
		}
	});

export const MoveLayerCommand = command("move-layer")
	.input(LayerMoveAskSchema)
	.idempotencyKey(PerCall)
	.inject({
		...PAGES_READ,
		designFiles: DesignFilesGateway,
		widgetDrawing: WidgetDrawingGateway,
	})
	.emits(DesignChangedEvent)
	.handle(
		async (
			{ dragged, parent, before },
			{ canvasMoment, designFolder, agentJobs, designFiles, widgetDrawing, emit },
		) => {
			const asked = canvasMoment.moment();
			const folder = await designFolder.folder(asked.app);
			const moment = canvasMoment.moment();

			const turned = pageTurnWhileRead(asked, moment, `move ${dragged}`);

			if (turned !== null) {
				console.info(`[widgetarium] ${turned}`);
				return;
			}

			const shown = shownScreenOf(pagesNowOf(moment, folder, agentJobs.jobsOf(moment.app)));
			const widget = shown?.picture?.widget;

			if (!shown || !widget) {
				return refuse(NOT_A_PAGE);
			}

			const draggedLayer = layerIn(moment.seenLayers[shown.key] ?? [], dragged);

			if (draggedLayer && !canDragLayer(draggedLayer, moment.isLayoutLocked)) {
				return refuse(NOT_DRAGGABLE);
			}

			const move = layerMoveTo(dragged, parent, before);

			if (!move) {
				return refuse(NOT_MOVABLE);
			}

			const widgetFolder = widgetDrawing.drawing().registry.get(widget)?.folder;

			if (!widgetFolder) {
				return refuse(NO_PAGE_FOLDER.replace("{widget}", widget));
			}

			const { sourceMoved } = await import("./lib/source-moved.js");
			await designFiles.changeText(`${widgetFolder}/${move.file}`, (source) => sourceMoved(source, move));
			designFolder.forgetFolder(moment.app);
			emit(DesignChangedEvent, { app: moment.app });
			console.info(`[widgetarium] layer ${dragged} of ${widget} → into ${parent} (moved)`);
		},
	);

export const PickLayerCommand = command("pick-layer")
	.input(LayerIdSchema)
	.idempotencyKey(Repeatable)
	.inject(PAGES_READ)
	.handle(async ({ id }, { canvasMoment, designFolder, agentJobs }) => {
		const asked = canvasMoment.moment();
		const folder = await designFolder.folder(asked.app);
		const moment = canvasMoment.moment();

		const turned = pageTurnWhileRead(asked, moment, `pick ${id}`);

		if (turned !== null) {
			console.info(`[widgetarium] ${turned}`);
			return;
		}

		const widget = shownScreenOf(pagesNowOf(moment, folder, agentJobs.jobsOf(moment.app)))?.picture?.widget;

		if (!widget) {
			return refuse(NOT_A_PICKABLE_PAGE);
		}

		const isPicked = pickedMarkOf(moment, [widget]) === id;
		const { change, reason } = pickedChange(
			moment,
			isPicked
				? null
				: {
						widget,
						mark: id,
						spot: null,
					},
		);
		const write = momentWriteOf(moment, change, reason);

		if (write !== null) {
			canvasMoment.saveMoment(write);
		}
	});

export const ToggleLayerFoldCommand = command("toggle-layer-fold")
	.input(LayerIdSchema)
	.idempotencyKey(Repeatable)
	.inject({ canvasMoment: CanvasMomentGateway })
	.handle(({ id }, { canvasMoment }) => {
		const moment = canvasMoment.moment();
		const closed = moment.closedLayers;
		const closedLayers = closed.includes(id) ? closed.filter((mark) => mark !== id) : [...closed, id];
		const write = momentWriteOf(moment, { closedLayers }, `fold ${id}`);

		if (write !== null) {
			canvasMoment.saveMoment(write);
		}
	});

export const ToggleLayoutLockCommand = command("toggle-layout-lock")
	.idempotencyKey(Repeatable)
	.inject({ canvasMoment: CanvasMomentGateway })
	.handle((_input, { canvasMoment }) => {
		const moment = canvasMoment.moment();
		const isLayoutLocked = !moment.isLayoutLocked;
		const write = momentWriteOf(moment, { isLayoutLocked }, isLayoutLocked ? "lock the layout" : "unlock the layout");

		if (write === null) {
			return;
		}

		canvasMoment.saveMoment(write);

		if (write.said !== null) {
			console.info(`[widgetarium] ${write.said}`);
		}
	});

export const SidebarQuery = query("sidebar")
	.output(SidebarSchema)
	.settlesNow()
	.inject({
		canvasMoment: CanvasMomentGateway,
		sidebarWidth: SidebarWidthGateway,
	})
	.handle((_input, { canvasMoment, sidebarWidth }) => ({
		isOpen: canvasMoment.moment().isLayersOpen,
		px: sidebarPxOf(sidebarWidth.sidebarPx()),
		leastPx: SIDEBAR_BOUNDS.leastPx,
		keptBesidePx: SIDEBAR_BOUNDS.keptBesidePx,
	}));

export const ToggleSidebarCommand = command("toggle-sidebar")
	.idempotencyKey(Repeatable)
	.inject({ canvasMoment: CanvasMomentGateway })
	.handle((_input, { canvasMoment }) => {
		const moment = canvasMoment.moment();
		const isLayersOpen = !moment.isLayersOpen;
		const write = momentWriteOf(moment, { isLayersOpen }, isLayersOpen ? "open the sidebar" : "close the sidebar");

		if (write === null) {
			return;
		}

		canvasMoment.saveMoment(write);

		if (write.said !== null) {
			console.info(`[widgetarium] ${write.said}`);
		}
	});

export const ResizeSidebarWidthCommand = command("resize-sidebar-width")
	.input(SidebarResizeSchema)
	.idempotencyKey(Repeatable)
	.inject({ sidebarWidth: SidebarWidthGateway })
	.handle(({ px, roomPx }, { sidebarWidth, invalidate }) => {
		const was = sidebarPxOf(sidebarWidth.sidebarPx());
		const next = sidebarPxWithin(px, roomPx);

		if (next === was) {
			return;
		}

		const reason = `canvas sidebar ${was}px → ${next}px (resize)`;
		sidebarWidth.saveSidebarPx(next, reason);
		invalidate(SidebarQuery);
		console.debug(`[widgetarium] ${reason}`);
	});

export const ResetSidebarWidthCommand = command("reset-sidebar-width")
	.idempotencyKey(Repeatable)
	.inject({ sidebarWidth: SidebarWidthGateway })
	.handle((_input, { sidebarWidth, invalidate }) => {
		const was = sidebarPxOf(sidebarWidth.sidebarPx());
		const next = SIDEBAR_BOUNDS.usualPx;

		if (next === was) {
			return;
		}

		const reason = `canvas sidebar ${was}px → ${next}px (reset)`;
		sidebarWidth.saveSidebarPx(next, reason);
		invalidate(SidebarQuery);
		console.debug(`[widgetarium] ${reason}`);
	});

export const RereadLayersSubscriber = subscriber(CanvasMomentChangedEvent).handle(({ fields }, { invalidate }) => {
	if (isTouching(fields, PANEL_FIELDS)) {
		invalidate(LayersPanelQuery);
	}

	if (fields.includes("isLayersOpen")) {
		invalidate(SidebarQuery);
	}
});

export const RereadLayersForDesignSubscriber = subscriber(DesignChangedEvent).handle((_input, { invalidate }) => {
	invalidate(LayersPanelQuery);
});

export const RereadLayersForJobsSubscriber = subscriber(JobsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(LayersPanelQuery);
});
