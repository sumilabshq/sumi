import { module, provided } from "@widgetarium/core/mediator";
import type { AppHost } from "@widgetarium/core/mediator";
import { CanvasHost, canvasHostOf } from "./ports/canvas-host.js";
import { DesignSource } from "./ports/design-source.port.js";
import { ObsidianDesignSource } from "./ports/design-source-obsidian.js";
import { WebDesignSource } from "./ports/design-source-web.js";
import { CachedDesignReads, DesignReads } from "./requests/design/design-reads.js";
import { FramePictureTaker, QueuedFramePictures } from "./requests/pictures/frame-picture-taker.js";
import { CanvasStore, createCanvasStore } from "./requests/view/canvas-store.js";
import { AgentLookQueryHandler } from "./requests/agent/agent-look.js";
import { ShowAgentPageCommandHandler } from "./requests/agent/show-agent-page.js";
import { DrawingQueryHandler } from "./requests/field/drawing.js";
import { FieldRegionsQueryHandler } from "./requests/field/field-regions.js";
import { FieldStateQueryHandler } from "./requests/field/field-state.js";
import { PickSpotCommandHandler } from "./requests/field/pick-spot.js";
import { ResolveSpotCommandHandler } from "./requests/field/resolve-spot.js";
import { JobStatusQueryHandler } from "./requests/jobs/job-status.js";
import { StopJobCommandHandler } from "./requests/jobs/stop-job.js";
import { LayersPanelQueryHandler } from "./requests/layers/layers-panel.js";
import { LayersToggleQueryHandler } from "./requests/layers/layers-toggle.js";
import { KeepSeenLayersCommandHandler } from "./requests/layers/keep-seen-layers.js";
import { MoveLayerCommandHandler } from "./requests/layers/move-layer.js";
import { PickLayerCommandHandler } from "./requests/layers/pick-layer.js";
import { ToggleLayerFoldCommandHandler } from "./requests/layers/toggle-layer-fold.js";
import { ToggleLayersCommandHandler } from "./requests/layers/toggle-layers.js";
import { ToggleLayoutLockCommandHandler } from "./requests/layers/toggle-layout-lock.js";
import { LookPanelQueryHandler } from "./requests/look/look-panel.js";
import { PickLookCommandHandler } from "./requests/look/pick-look.js";
import { FinishFlightCommandHandler } from "./requests/pages/finish-flight.js";
import { FocusWidgetCommandHandler } from "./requests/pages/focus-widget.js";
import { DesignSummaryQueryHandler } from "./requests/pages/design-summary.js";
import { PageTabsQueryHandler } from "./requests/pages/page-tabs.js";
import { VariantsQueryHandler } from "./requests/pages/variants.js";
import { PickVariantCommandHandler } from "./requests/pages/pick-variant.js";
import { ReturnToViewCommandHandler } from "./requests/pages/return-to-view.js";
import { DesignSourceViewReturn, HostViewReturn, ViewReturn } from "./requests/pages/view-return.js";
import { ShowPageCommandHandler } from "./requests/pages/show-page.js";
import { AddPhotosCommandHandler } from "./requests/photos/add-photos.js";
import { PastePhotosCommandHandler } from "./requests/photos/paste-photos.js";
import { AskForPictureCommandHandler } from "./requests/pictures/ask-for-picture.js";
import { FramePictureQueryHandler } from "./requests/pictures/frame-picture.js";
import { PicturesProgressQueryHandler } from "./requests/pictures/pictures-progress.js";
import { NoteBoardQueryHandler } from "./requests/shots/note-board.js";
import { ShotCountQueryHandler } from "./requests/shots/shot-count.js";
import { ShotPartQueryHandler } from "./requests/shots/shot-part.js";
import { ChooseRendererCommandHandler } from "./requests/view/choose-renderer.js";
import { CameraQueryHandler } from "./requests/view/camera.js";
import { ModeQueryHandler } from "./requests/view/mode.js";
import { RendererSwitchQueryHandler } from "./requests/view/renderer-switch.js";
import { KeepCameraCommandHandler } from "./requests/view/keep-camera.js";
import { SetModeCommandHandler } from "./requests/view/set-mode.js";

declare const __WG_PLATFORM__: string | undefined;

const NO_DESIGN_SOURCE = "the canvas host names {platform} but hands no design to read";
const NOT_BUILT_FOR_OBSIDIAN = "this build of the canvas carries no Obsidian design source";

export const canvasModule = module({
	name: "canvas",
	handlers: [
		AgentLookQueryHandler,
		ShowAgentPageCommandHandler,
		DrawingQueryHandler,
		FieldRegionsQueryHandler,
		FieldStateQueryHandler,
		PickSpotCommandHandler,
		ResolveSpotCommandHandler,
		JobStatusQueryHandler,
		StopJobCommandHandler,
		LayersPanelQueryHandler,
		LayersToggleQueryHandler,
		KeepSeenLayersCommandHandler,
		MoveLayerCommandHandler,
		PickLayerCommandHandler,
		ToggleLayerFoldCommandHandler,
		ToggleLayersCommandHandler,
		ToggleLayoutLockCommandHandler,
		LookPanelQueryHandler,
		PickLookCommandHandler,
		FinishFlightCommandHandler,
		FocusWidgetCommandHandler,
		DesignSummaryQueryHandler,
		PageTabsQueryHandler,
		VariantsQueryHandler,
		PickVariantCommandHandler,
		ReturnToViewCommandHandler,
		ShowPageCommandHandler,
		AddPhotosCommandHandler,
		PastePhotosCommandHandler,
		AskForPictureCommandHandler,
		FramePictureQueryHandler,
		PicturesProgressQueryHandler,
		NoteBoardQueryHandler,
		ShotCountQueryHandler,
		ShotPartQueryHandler,
		ChooseRendererCommandHandler,
		CameraQueryHandler,
		ModeQueryHandler,
		RendererSwitchQueryHandler,
		KeepCameraCommandHandler,
		SetModeCommandHandler,
	],
	provide: [
		provided(CanvasHost, canvasHostOf),
		provided(DesignSource, designSourceOf),
		provided(CanvasStore, (host) => {
			const { opened, keepOpening } = canvasHostOf(host);
			return createCanvasStore(opened, keepOpening);
		}),
		provided(DesignReads, () => new CachedDesignReads()),
		provided(FramePictureTaker, () => new QueuedFramePictures()),
		provided(ViewReturn, viewReturnOf),
	],
});

function designSourceOf(host: AppHost): DesignSource {
	const { obsidian, project } = canvasHostOf(host);
	if (!host.is("obsidian")) return new WebDesignSource(project ?? refusedWithout("web"));
	return typeof __WG_PLATFORM__ === "string" && __WG_PLATFORM__ === "web"
		? refusedOffBuild()
		: new ObsidianDesignSource(obsidian ?? refusedWithout("obsidian"));
}

function refusedOffBuild(): never {
	throw new Error(NOT_BUILT_FOR_OBSIDIAN);
}

function viewReturnOf(host: AppHost): ViewReturn {
	const { returnToView } = canvasHostOf(host);
	return returnToView ? new HostViewReturn(returnToView) : new DesignSourceViewReturn();
}

function refusedWithout(platform: string): never {
	throw new Error(NO_DESIGN_SOURCE.replace("{platform}", platform));
}
