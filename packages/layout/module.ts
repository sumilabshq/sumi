import { module } from "@widgetarium/core/requests";
import type { LayoutParts } from "./gateways/layout-parts/layout-parts.gateway.js";
import {
	AimPaneCommand,
	ClosePaneCommand,
	PaneTreeQuery,
	PlacePaneCommand,
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
	.queries(FrameSidesQuery, FrameWidthsQuery, PaneTreeQuery)
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
	)
	.provide((parts: LayoutParts) => ({ ...parts }));
