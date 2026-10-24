import { Device, module } from "@widgetarium/core/requests";
import { FrameSidesChangedEvent } from "./gateways/frame-sides/frame-sides.events.js";
import { FrameWidthsChangedEvent } from "./gateways/frame-widths/frame-widths.events.js";
import { PanesChangedEvent } from "./gateways/pane-tree/pane-tree.events.js";
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
	PanesOnPanesChangedSubscriber,
	PlacePaneCommand,
	PlacementPreviewQuery,
	ResizePaneSplitCommand,
} from "./features/panes/requests.js";
import {
	ConcealFrameSideCommand,
	FrameSidesOnFrameSidesChangedSubscriber,
	FrameSidesQuery,
	PeekFrameSideCommand,
	ToggleFrameSideCommand,
} from "./features/frame-sides/requests.js";
import {
	FrameWidthsOnFrameWidthsChangedSubscriber,
	FrameWidthsQuery,
	ResetFrameEdgeCommand,
	ResizeFrameEdgeCommand,
} from "./features/frame-widths/requests.js";

export const LayoutModule = module("layout")
	.on(Device)
	.emits(FrameSidesChangedEvent, FrameWidthsChangedEvent, PanesChangedEvent)
	.subscribers(
		FrameSidesOnFrameSidesChangedSubscriber,
		FrameWidthsOnFrameWidthsChangedSubscriber,
		PanesOnPanesChangedSubscriber,
	)
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
