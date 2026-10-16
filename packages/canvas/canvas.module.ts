import { module, provided } from "@widgetarium/core/mediator";
import type { Inject, ObsidianHost } from "@widgetarium/core/mediator";
import { CanvasHost } from "./adapters/canvas-host/canvas-host.adapter.js";
import type { CanvasMount } from "./adapters/canvas-host/canvas-host.adapter.js";
import { MountedCanvasHost } from "./adapters/canvas-host/mounted.adapter.js";
import { DesignSource } from "./adapters/design-source/design-source.adapter.js";
import { ObsidianDesignSource } from "./adapters/design-source/obsidian/obsidian.adapter.js";
import { ProjectDesignSource } from "./adapters/design-source/project.adapter.js";
import { CachedDesignReads, DesignReads } from "./lib/design/design-reads.js";
import { DesignSourceViewReturn, HostViewReturn, ViewReturn } from "./lib/pages/view-return.js";
import { FramePictureTaker, QueuedFramePictures } from "./lib/pictures/frame-picture-taker.js";
import { CanvasStore, createCanvasStore } from "./lib/view/canvas-store.js";
import { AgentLookQueryHandler } from "./client/agent/agent-look.handler.js";
import { ShowAgentPageCommandHandler } from "./client/agent/show-agent-page.handler.js";
import { DrawingQueryHandler } from "./client/field/drawing.handler.js";
import { FieldRegionsQueryHandler } from "./client/field/field-regions.handler.js";
import { FieldStateQueryHandler } from "./client/field/field-state.handler.js";
import { PickSpotCommandHandler } from "./client/field/pick-spot.handler.js";
import { ResolveSpotCommandHandler } from "./client/field/resolve-spot.handler.js";
import { JobStatusQueryHandler } from "./client/jobs/job-status.handler.js";
import { StopJobCommandHandler } from "./client/jobs/stop-job.handler.js";
import { LayersPanelQueryHandler } from "./client/layers/layers-panel.handler.js";
import { LayersToggleQueryHandler } from "./client/layers/layers-toggle.handler.js";
import { KeepSeenLayersCommandHandler } from "./client/layers/keep-seen-layers.handler.js";
import { MoveLayerCommandHandler } from "./client/layers/move-layer.handler.js";
import { PickLayerCommandHandler } from "./client/layers/pick-layer.handler.js";
import { ToggleLayerFoldCommandHandler } from "./client/layers/toggle-layer-fold.handler.js";
import { ToggleLayersCommandHandler } from "./client/layers/toggle-layers.handler.js";
import { ToggleLayoutLockCommandHandler } from "./client/layers/toggle-layout-lock.handler.js";
import { LookPanelQueryHandler } from "./client/look/look-panel.handler.js";
import { PickLookCommandHandler } from "./client/look/pick-look.handler.js";
import { FinishFlightCommandHandler } from "./client/pages/finish-flight.handler.js";
import { FocusWidgetCommandHandler } from "./client/pages/focus-widget.handler.js";
import { DesignSummaryQueryHandler } from "./client/pages/design-summary.handler.js";
import { PageTabsQueryHandler } from "./client/pages/page-tabs.handler.js";
import { VariantsQueryHandler } from "./client/pages/variants.handler.js";
import { PickVariantCommandHandler } from "./client/pages/pick-variant.handler.js";
import { ReturnToViewCommandHandler } from "./client/pages/return-to-view.handler.js";
import { ShowPageCommandHandler } from "./client/pages/show-page.handler.js";
import { AddPhotosCommandHandler } from "./client/photos/add-photos.handler.js";
import { PastePhotosCommandHandler } from "./client/photos/paste-photos.handler.js";
import { AskForPictureCommandHandler } from "./client/pictures/ask-for-picture.handler.js";
import { FramePictureQueryHandler } from "./client/pictures/frame-picture.handler.js";
import { PicturesProgressQueryHandler } from "./client/pictures/pictures-progress.handler.js";
import { NoteBoardQueryHandler } from "./client/shots/note-board.handler.js";
import { ShotCountQueryHandler } from "./client/shots/shot-count.handler.js";
import { ShotPartQueryHandler } from "./client/shots/shot-part.handler.js";
import { ChooseRendererCommandHandler } from "./client/view/choose-renderer.handler.js";
import { CameraQueryHandler } from "./client/view/camera.handler.js";
import { ModeQueryHandler } from "./client/view/mode.handler.js";
import { RendererSwitchQueryHandler } from "./client/view/renderer-switch.handler.js";
import { KeepCameraCommandHandler } from "./client/view/keep-camera.handler.js";
import { SetModeCommandHandler } from "./client/view/set-mode.handler.js";

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
		provided(CanvasHost, {
			obsidian: canvasHostOf,
			web: canvasHostOf,
		}),
		provided(DesignSource, {
			obsidian: obsidianDesignSourceOf,
			web: (host) => new ProjectDesignSource(host.project),
		}),
		provided(CanvasStore, { obsidian: canvasStoreOf, web: canvasStoreOf }),
		provided(DesignReads, { obsidian: designReadsOf, web: designReadsOf }),
		provided(FramePictureTaker, { obsidian: framePicturesOf, web: framePicturesOf }),
		provided(ViewReturn, {
			obsidian: obsidianViewReturnOf,
			web: (host) => new HostViewReturn(host.canvas.returnToView),
		}),
	],
});

function canvasHostOf({ canvas }: { readonly canvas: CanvasMount }): CanvasHost {
	return new MountedCanvasHost(canvas);
}

function obsidianDesignSourceOf({ app, canvas }: ObsidianHost): DesignSource {
	const { design } = canvas;
	return design.kind === "vault" ? new ObsidianDesignSource(app, design.held) : new ProjectDesignSource(design.project);
}

function obsidianViewReturnOf({ canvas }: ObsidianHost, inject: Inject): ViewReturn {
	const { returnTo } = canvas;
	if (returnTo !== "app-note") return new HostViewReturn(returnTo);
	return new DesignSourceViewReturn(inject(DesignReads), inject(DesignSource), inject(CanvasStore));
}

function canvasStoreOf(_host: unknown, inject: Inject): CanvasStore {
	const canvasHost = inject(CanvasHost);
	return createCanvasStore(canvasHost.opened, (kept) => canvasHost.keepOpening(kept));
}

function designReadsOf(_host: unknown, inject: Inject): DesignReads {
	return new CachedDesignReads(inject(DesignSource));
}

function framePicturesOf(): FramePictureTaker {
	return new QueuedFramePictures();
}
