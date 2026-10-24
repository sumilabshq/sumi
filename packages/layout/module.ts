import { module } from "@widgetarium/core/requests";
import type { LayoutParts } from "./gateways/layout-parts/layout-parts.gateway.js";
import {
	AimPaneCommand,
	ClosePaneCommand,
	ClosePanesOfTabsCommand,
	CloseShownTabPaneCommand,
	DropGoneTabsCommand,
	OpenShownTabPaneCommand,
	PaneTreeQuery,
	PlacePaneCommand,
	PlacementPreviewQuery,
	ResizePaneSplitCommand,
	ShowTabInTargetPaneCommand,
} from "./features/panes/requests.js";
import {
	ConcealFrameSideCommand,
	FrameSidesQuery,
	PeekFrameSideCommand,
	ToggleFrameSideCommand,
} from "./features/frame-sides/requests.js";
import { FrameWidthsQuery, ResetFrameEdgeCommand, ResizeFrameEdgeCommand } from "./features/frame-widths/requests.js";

export const LayoutModule = module("layout")
	.queries(FrameSidesQuery, FrameWidthsQuery, PaneTreeQuery, PlacementPreviewQuery)
	.commands(
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
	.provide((parts: LayoutParts) => ({ ...parts }));
