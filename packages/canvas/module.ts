import { module } from "@widgetarium/core/requests";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import { AppLook } from "./adapters/app-look/app-look.adapter.js";
import { ProjectAppLook } from "./adapters/app-look/project.adapter.js";
import { CanvasHost } from "./adapters/canvas-host/canvas-host.adapter.js";
import { DesignDrawing } from "./adapters/design-drawing/design-drawing.adapter.js";
import { ProjectDesignDrawing } from "./adapters/design-drawing/project.adapter.js";
import { DesignFolder } from "./adapters/design-folder/design-folder.adapter.js";
import { ProjectDesignFolder } from "./adapters/design-folder/project.adapter.js";
import { DesignJobs } from "./adapters/design-jobs/design-jobs.adapter.js";
import { ProjectDesignJobs } from "./adapters/design-jobs/project.adapter.js";
import { DesignLayers } from "./adapters/design-layers/design-layers.adapter.js";
import { ProjectDesignLayers } from "./adapters/design-layers/project.adapter.js";
import { DesignPhotos } from "./adapters/design-photos/design-photos.adapter.js";
import { ProjectDesignPhotos } from "./adapters/design-photos/project.adapter.js";
import { agentLookHandler, showAgentPageHandler } from "./features/agent/handlers.js";
import {
	drawingHandler,
	fieldRegionsHandler,
	fieldStateHandler,
	pickSpotHandler,
	resolveSpotHandler,
} from "./features/field/handlers.js";
import { jobStatusHandler, stopJobHandler } from "./features/jobs/handlers.js";
import {
	keepSeenLayersHandler,
	layersPanelHandler,
	layersToggleHandler,
	moveLayerHandler,
	pickLayerHandler,
	toggleLayerFoldHandler,
	toggleLayersHandler,
	toggleLayoutLockHandler,
} from "./features/layers/handlers.js";
import { lookPanelHandler, pickLookHandler } from "./features/look/handlers.js";
import {
	designSummaryHandler,
	finishFlightHandler,
	focusWidgetHandler,
	pageTabsHandler,
	pickVariantHandler,
	returnToViewHandler,
	showPageHandler,
	variantsHandler,
} from "./features/pages/handlers.js";
import { addPhotosHandler, pastePhotosHandler } from "./features/photos/handlers.js";
import { askForPictureHandler, framePictureHandler, picturesProgressHandler } from "./features/pictures/handlers.js";
import { noteBoardHandler, shotCountHandler, shotPartHandler } from "./features/shots/handlers.js";
import {
	cameraHandler,
	chooseRendererHandler,
	keepCameraHandler,
	modeHandler,
	rendererSwitchHandler,
	setModeHandler,
} from "./features/view/handlers.js";
import { CachedDesignReads } from "./lib/design/design-reads.js";
import { PhotoQueue } from "./lib/photos/photo-queue.js";
import { QueuedFramePictures } from "./lib/pictures/frame-picture-taker.js";
import { MomentCanvasStore } from "./lib/view/canvas-store.js";

export interface CanvasParts {
	readonly canvasHost: CanvasHost;
	readonly designFolder: DesignFolder;
	readonly designJobs: DesignJobs;
	readonly designDrawing: DesignDrawing;
	readonly designPhotos: DesignPhotos;
	readonly designLayers: DesignLayers;
	readonly appLook: AppLook;
}

export const canvasModule = module("canvas", {
	runs: "client",
	handlers: [
		agentLookHandler,
		showAgentPageHandler,
		drawingHandler,
		fieldRegionsHandler,
		fieldStateHandler,
		pickSpotHandler,
		resolveSpotHandler,
		jobStatusHandler,
		stopJobHandler,
		keepSeenLayersHandler,
		layersPanelHandler,
		layersToggleHandler,
		moveLayerHandler,
		pickLayerHandler,
		toggleLayerFoldHandler,
		toggleLayersHandler,
		toggleLayoutLockHandler,
		lookPanelHandler,
		pickLookHandler,
		designSummaryHandler,
		finishFlightHandler,
		focusWidgetHandler,
		pageTabsHandler,
		pickVariantHandler,
		returnToViewHandler,
		showPageHandler,
		variantsHandler,
		addPhotosHandler,
		pastePhotosHandler,
		askForPictureHandler,
		framePictureHandler,
		picturesProgressHandler,
		noteBoardHandler,
		shotCountHandler,
		shotPartHandler,
		cameraHandler,
		chooseRendererHandler,
		keepCameraHandler,
		modeHandler,
		rendererSwitchHandler,
		setModeHandler,
	],
	provide: (parts: CanvasParts) => ({
		...parts,
		canvasStore: new MomentCanvasStore(parts.canvasHost.opened, (kept) => parts.canvasHost.keepOpening(kept)),
		designReads: new CachedDesignReads(parts.designFolder, parts.designJobs, parts.appLook),
		framePictures: new QueuedFramePictures(),
		photoQueue: new PhotoQueue(),
	}),
});

export function projectCanvasParts(project: StartedProject, canvasHost: CanvasHost): CanvasParts {
	return {
		canvasHost,
		designFolder: new ProjectDesignFolder(project),
		designJobs: new ProjectDesignJobs(),
		designDrawing: new ProjectDesignDrawing(project),
		designPhotos: new ProjectDesignPhotos(),
		designLayers: new ProjectDesignLayers(),
		appLook: new ProjectAppLook(),
	};
}

export { AppLook } from "./adapters/app-look/app-look.adapter.js";
export { CanvasHost } from "./adapters/canvas-host/canvas-host.adapter.js";
export type { ReturnTo } from "./adapters/canvas-host/canvas-host.adapter.js";
export { MountedCanvasHost, detachedMountOf } from "./adapters/canvas-host/mounted.adapter.js";
export type { CanvasMount } from "./adapters/canvas-host/mounted.adapter.js";
export { DesignDrawing } from "./adapters/design-drawing/design-drawing.adapter.js";
export { DesignFolder } from "./adapters/design-folder/design-folder.adapter.js";
export { DesignJobs } from "./adapters/design-jobs/design-jobs.adapter.js";
export { DesignLayers } from "./adapters/design-layers/design-layers.adapter.js";
export type { SourceEdit } from "./adapters/design-layers/design-layers.adapter.js";
export { DesignPhotos } from "./adapters/design-photos/design-photos.adapter.js";
export { whileAgentLooks } from "./lib/agent/agent-looks.js";
