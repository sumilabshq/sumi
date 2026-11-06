import { Device, module, oneOf } from "@widgetarium/data-framework";
import { StoreClient } from "@widgetarium/behaviors/tauri-store";
import { PanesChangedEvent } from "./gateways/pane-tree/pane-tree.events.js";
import { layoutPartsOn } from "./gateways/layout-parts/layout-parts.gateway.js";
import { StudioWindowsHost } from "./shared/host/layout.host.js";
import {
	ClosePanesOfTabsCommand,
	CloseShownTabPaneCommand,
	DropGoneTabsCommand,
	OpenShownTabPaneCommand,
	ShowChatInPaneCommand,
	ShowTabInChatGroupCommand,
	ShowTabInTargetPaneCommand,
} from "./features/pane-tabs/requests.js";
import { FocusSplitCommand, LeaveSplitCommand, ShowSplitCommand } from "./features/split-board/requests.js";
import {
	AimPaneCommand,
	ClosePaneCommand,
	PaneTreeQuery,
	RereadPanesSubscriber,
	PlacePaneCommand,
	PlacementPreviewQuery,
	ResizePaneSplitCommand,
} from "./features/panes/requests.js";
import {
	ConcealFrameSideCommand,
	RereadSidesSubscriber,
	FrameSidesQuery,
	PeekFrameSideCommand,
	ToggleFrameSideCommand,
} from "./features/frame-sides/requests.js";
import {
	RereadFrameWidthsSubscriber,
	FrameWidthsQuery,
	ResetFrameEdgeCommand,
	ResizeFrameEdgeCommand,
} from "./features/frame-widths/requests.js";

export { StudioWindowsHost } from "./shared/host/layout.host.js";

export const LayoutModule = module("layout")
	.on(Device)
	.needs(oneOf({ tauri: { store: StoreClient, studioWindows: StudioWindowsHost }, elsewhere: {} }))
	.subscribers(RereadSidesSubscriber, RereadFrameWidthsSubscriber, RereadPanesSubscriber)
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
		ShowChatInPaneCommand,
		ShowTabInTargetPaneCommand,
		ShowTabInChatGroupCommand,
		OpenShownTabPaneCommand,
		CloseShownTabPaneCommand,
		ClosePanesOfTabsCommand,
		DropGoneTabsCommand,
		ShowSplitCommand,
		FocusSplitCommand,
		LeaveSplitCommand,
		PanesChangedEvent,
	)
	.provide((facts) => ({ ...layoutPartsOn(facts) }));
