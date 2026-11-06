import { Device, module, oneOf } from "@widgetarium/framework";
import { canvasPartsOn } from "./gateways/canvas-parts/canvas-parts.gateway.js";
import { AgentJobsHost } from "./shared/host/agent-jobs.host.js";
import { DataAdapterHost } from "./shared/host/data-adapter.host.js";
import { DrawingSurfaceHost } from "./shared/host/drawing-surface.host.js";
import { StartedProjectHost } from "./shared/host/started-project.host.js";
import { WidgetRegistryHost } from "./shared/host/widget-registry.host.js";
import {
	DrawingQuery,
	RereadFieldSubscriber,
	RereadFieldForDesignSubscriber,
	RereadFieldForJobsSubscriber,
	FieldRegionsQuery,
	FieldStateQuery,
	PickSpotCommand,
	ResolveSpotCommand,
} from "./features/field/requests.js";
import {
	JobStatusQuery,
	RereadJobStatusForMomentSubscriber,
	RereadJobStatusForDesignSubscriber,
	RereadJobStatusSubscriber,
	StopJobCommand,
} from "./features/jobs/requests.js";
import {
	KeepSeenLayersCommand,
	RereadLayersSubscriber,
	RereadLayersForDesignSubscriber,
	RereadLayersForJobsSubscriber,
	LayersPanelQuery,
	MoveLayerCommand,
	PickLayerCommand,
	ResetSidebarWidthCommand,
	ResizeSidebarWidthCommand,
	SidebarQuery,
	ToggleLayerFoldCommand,
	ToggleLayoutLockCommand,
	ToggleSidebarCommand,
} from "./features/layers/requests.js";
import {
	RereadLookSubscriber,
	RereadLookForDesignSubscriber,
	LookPanelQuery,
	PickLookCommand,
} from "./features/look/requests.js";
import {
	FinishFlightCommand,
	FocusWidgetCommand,
	PageChoicesQuery,
	RereadPagesSubscriber,
	RereadPagesForDesignSubscriber,
	RereadPagesForJobsSubscriber,
	PagesQuery,
	PickVariantCommand,
	ReturnNoteQuery,
	ShowPageCommand,
	VariantsQuery,
} from "./features/pages/requests.js";
import { AddPhotosCommand } from "./features/photos/requests.js";
import {
	CameraQuery,
	CanvasOpeningQuery,
	KeepCameraCommand,
	ModeQuery,
	OpenCanvasCommand,
	SetModeCommand,
	RereadViewSubscriber,
} from "./features/view/requests.js";

export { AgentJobsHost } from "./shared/host/agent-jobs.host.js";
export { DataAdapterHost } from "./shared/host/data-adapter.host.js";
export { DrawingSurfaceHost } from "./shared/host/drawing-surface.host.js";
export { StartedProjectHost } from "./shared/host/started-project.host.js";
export { WidgetRegistryHost } from "./shared/host/widget-registry.host.js";

export const CanvasModule = module("canvas")
	.on(Device)
	.needs(
		oneOf({
			vault: {
				adapter: DataAdapterHost,
				registry: WidgetRegistryHost,
				drawingHost: DrawingSurfaceHost,
				agentJobs: AgentJobsHost,
			},
			project: {
				project: StartedProjectHost,
			},
		}),
	)
	.subscribers(
		RereadFieldSubscriber,
		RereadFieldForDesignSubscriber,
		RereadFieldForJobsSubscriber,
		RereadJobStatusForMomentSubscriber,
		RereadJobStatusForDesignSubscriber,
		RereadJobStatusSubscriber,
		RereadLayersSubscriber,
		RereadLayersForDesignSubscriber,
		RereadLayersForJobsSubscriber,
		RereadLookSubscriber,
		RereadLookForDesignSubscriber,
		RereadPagesSubscriber,
		RereadPagesForDesignSubscriber,
		RereadPagesForJobsSubscriber,
		RereadViewSubscriber,
	)
	.public(
		OpenCanvasCommand,
		CanvasOpeningQuery,
		CameraQuery,
		KeepCameraCommand,
		ModeQuery,
		SetModeCommand,
		DrawingQuery,
		FieldRegionsQuery,
		FieldStateQuery,
		PickSpotCommand,
		ResolveSpotCommand,
		JobStatusQuery,
		StopJobCommand,
		LayersPanelQuery,
		KeepSeenLayersCommand,
		MoveLayerCommand,
		PickLayerCommand,
		ToggleLayerFoldCommand,
		ToggleLayoutLockCommand,
		SidebarQuery,
		ToggleSidebarCommand,
		ResizeSidebarWidthCommand,
		ResetSidebarWidthCommand,
		LookPanelQuery,
		PickLookCommand,
		PageChoicesQuery,
		PagesQuery,
		VariantsQuery,
		ReturnNoteQuery,
		ShowPageCommand,
		FocusWidgetCommand,
		FinishFlightCommand,
		PickVariantCommand,
		AddPhotosCommand,
	)
	.provide((facts) => canvasPartsOn(facts));
