import { Repeatable } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { placedTabsChanged } from "../../gateways/tabs/tabs.events.js";
import { windowBoardOf } from "../../shared/lib/panes/window-boards.js";
import { boardOf, placementPreviewOf } from "../../shared/lib/panes/pane-trees.js";
import { PaneBoardSchema, PlacementPreviewSchema } from "../../shared/schema/pane-tree.schema.js";
import {
	ChatInPaneAskSchema,
	HeldTabsInPanesAskSchema,
	PaneAskSchema,
	PlaceAskSchema,
	PreviewAskSchema,
	ResizePaneSplitAskSchema,
	SeatAskSchema,
	TabInPaneAskSchema,
	TabsInPanesAskSchema,
} from "../../shared/schema/pane-asks.schema.js";
import {
	aimPlan,
	closePlan,
	closeShowingPanesPlan,
	closeShownPlan,
	dropGoneTabsPlan,
	openShownPlan,
	panesMoved,
	placePlan,
	refusePlacement,
	resizeSplitPlan,
	saidOrRefused,
	showChatPlan,
	showInTargetPlan,
} from "./lib/pane-plans.js";

export const board = query()
	.public()
	.input(SeatAskSchema)
	.output(PaneBoardSchema)
	.handle(async ({ seat }, { tabs, placedApps }) => {
		const { tree, others } = windowBoardOf({ placed: await tabs.placedTabs(), seat, apps: placedApps.placedApps() });
		return boardOf(tree, others);
	});

export const placementPreview = query()
	.public()
	.input(PreviewAskSchema)
	.output(PlacementPreviewSchema.nullable())
	.handle(async ({ seat, placement }, { tabs, placedApps }) => {
		if (placement === null) {
			return null;
		}

		const { tree } = windowBoardOf({ placed: await tabs.placedTabs(), seat, apps: placedApps.placedApps() });
		return refusePlacement(tree, placement) === null ? placementPreviewOf(tree, placement.view, placement) : null;
	});

export const place = command()
	.public()
	.input(PlaceAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ seat, placement }, { tabs, placedApps }) =>
		saidOrRefused(await tabs.movePlacedTabs(panesMoved({ seat, apps: placedApps.placedApps() }, placePlan(placement)))),
	);

export const close = command()
	.public()
	.input(PaneAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ seat, id }, { tabs, placedApps }) =>
		saidOrRefused(await tabs.movePlacedTabs(panesMoved({ seat, apps: placedApps.placedApps() }, closePlan(id)))),
	);

export const resizeSplit = command()
	.public()
	.input(ResizePaneSplitAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ seat, ...asked }, { tabs, placedApps }) =>
		saidOrRefused(await tabs.movePlacedTabs(panesMoved({ seat, apps: placedApps.placedApps() }, resizeSplitPlan(asked)))),
	);

export const aim = command()
	.public()
	.input(PaneAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ seat, id }, { tabs, placedApps }) =>
		saidOrRefused(await tabs.movePlacedTabs(panesMoved({ seat, apps: placedApps.placedApps() }, aimPlan(id)))),
	);

export const showInTarget = command()
	.public()
	.input(TabInPaneAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ seat, tabId }, { tabs, placedApps }) =>
		saidOrRefused(await tabs.movePlacedTabs(panesMoved({ seat, apps: placedApps.placedApps() }, showInTargetPlan(tabId)))),
	);

export const showChat = command()
	.public()
	.input(ChatInPaneAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ seat, chatId, paneId }, { tabs, placedApps }) =>
		saidOrRefused(
			await tabs.movePlacedTabs(panesMoved({ seat, apps: placedApps.placedApps() }, showChatPlan(chatId, paneId))),
		),
	);

export const openShown = command()
	.public()
	.input(SeatAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ seat }, { tabs, placedApps }) =>
		saidOrRefused(await tabs.movePlacedTabs(panesMoved({ seat, apps: placedApps.placedApps() }, openShownPlan()))),
	);

export const closeShown = command()
	.public()
	.input(SeatAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ seat }, { tabs, placedApps }) =>
		saidOrRefused(await tabs.movePlacedTabs(panesMoved({ seat, apps: placedApps.placedApps() }, closeShownPlan()))),
	);

export const closeShowingPanes = command()
	.public()
	.input(TabsInPanesAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ seat, tabIds }, { tabs, placedApps }) =>
		saidOrRefused(
			await tabs.movePlacedTabs(panesMoved({ seat, apps: placedApps.placedApps() }, closeShowingPanesPlan(tabIds))),
		),
	);

export const dropGoneTabs = command()
	.public()
	.input(HeldTabsInPanesAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ seat, heldTabIds }, { tabs, placedApps }) =>
		saidOrRefused(
			await tabs.movePlacedTabs(panesMoved({ seat, apps: placedApps.placedApps() }, dropGoneTabsPlan(heldTabIds))),
		),
	);

export const rereadBoard = subscriber(placedTabsChanged).handle((_input, { invalidate }) => {
	invalidate(board);
	invalidate(placementPreview);
});
