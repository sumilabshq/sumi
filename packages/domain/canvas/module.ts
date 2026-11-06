import { Device, module } from "@widgetarium/data-framework";
import { canvasPartsOn } from "./gateways/canvas-parts/canvas-parts.gateway.js";
import type { CanvasHosts } from "./gateways/canvas-parts/canvas-parts.gateway.js";
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

export type { AgentJobs } from "./shared/host/agent-jobs.host.js";
export type { CanvasHosts } from "./gateways/canvas-parts/canvas-parts.gateway.js";

export const CanvasModule = module("canvas")
	.on(Device)
	.config<CanvasHosts>()
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
