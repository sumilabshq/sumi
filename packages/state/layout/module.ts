import { Device, module } from "@widgetarium/core/requests";
import { layoutPartsOn } from "./gateways/layout-parts/layout-parts.gateway.js";
import {
	ClosePanesOfTabsCommand,
	CloseShownTabPaneCommand,
	DropGoneTabsCommand,
	OpenShownTabPaneCommand,
	ShowTabInTargetPaneCommand,
} from "./features/pane-tabs/requests.js";
import {
	AimPaneCommand,
	ClosePaneCommand,
	PaneTreeQuery,
	PlacePaneCommand,
	PlacementPreviewQuery,
	ResizePaneSplitCommand,
} from "./features/panes/requests.js";
import {
	ConcealFrameSideCommand,
	FrameSidesQuery,
	PeekFrameSideCommand,
	ToggleFrameSideCommand,
} from "./features/frame-sides/requests.js";
import { FrameWidthsQuery, ResetFrameEdgeCommand, ResizeFrameEdgeCommand } from "./features/frame-widths/requests.js";

export const LayoutModule = module("layout")
	.on(Device)
	.public(
		FrameSidesQuery,
		FrameWidthsQuery,
		PaneTreeQuery,
		PlacementPreviewQuery,
		ToggleFrameSideCommand,
		PeekFrameSideCommand,
		ConcealFrameSideCommand,
		ResizeFrameEdgeCommand,
		ResetFrameEdgeCommand,
		PlacePaneCommand,
		ClosePaneCommand,
		ResizePaneSplitCommand,
		AimPaneCommand,
		ShowTabInTargetPaneCommand,
		OpenShownTabPaneCommand,
		CloseShownTabPaneCommand,
		ClosePanesOfTabsCommand,
		DropGoneTabsCommand,
	)
	.provide((facts) => ({ ...layoutPartsOn(facts) }));
