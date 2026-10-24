import { z } from "zod";
import { Repeatable, command, refuse } from "@widgetarium/core/requests";
import { PaneTreeGateway } from "../../gateways/pane-tree/pane-tree.gateway.js";
import { PaneTreeQuery, PlacementPreviewQuery } from "../../generated/contract.js";
import {
	chatPaneOf,
	goneTabPanesOf,
	paneShowingTab,
	placedTreeOf,
	shownTabPaneOf,
	tabPaneIdsOf,
	tabTargetOf,
	treeWithoutGoneTabs,
	treeWithoutPane,
	treeWithoutPanes,
	withTabShown,
} from "../../shared/lib/pane-trees.js";
import { goneTabsWords, paneTransitionOf } from "../../shared/lib/pane-words.js";

const NO_TAB_TARGET = "the target pane is not an app pane showing a tab";

export const ShowTabInTargetPaneCommand = command("show-tab-in-target-pane")
	.input(z.object({ tabId: z.string() }))
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery, PlacementPreviewQuery])
	.inject({ paneTree: PaneTreeGateway })
	.handle(({ tabId }, { paneTree }) => {
		const tree = paneTree.tree();
		const target = tabTargetOf(tree);

		if (target === null) {
			return refuse(NO_TAB_TARGET);
		}

		const standing = paneShowingTab(tree, tabId);

		if (standing !== null && standing !== target.paneId) {
			return refuse(`tab ${tabId} already stands in ${standing}`);
		}

		if (standing === target.paneId) {
			console.info(`[widgetarium] show tab ${tabId} skipped: the target pane shows it already`);
			return;
		}

		const next = withTabShown(tree, target.paneId, tabId);
		const reason = paneTransitionOf(tree, next, `show tab ${tabId} in the target pane`);
		paneTree.saveTree(next, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const OpenShownTabPaneCommand = command("open-shown-tab-pane")
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery, PlacementPreviewQuery])
	.inject({ paneTree: PaneTreeGateway })
	.handle((_input, { paneTree }) => {
		const tree = paneTree.tree();

		if (shownTabPaneOf(tree) !== null) {
			console.info("[widgetarium] open the shown tab pane skipped: it stands already");
			return;
		}

		const placed = placedTreeOf(
			tree,
			{
				kind: "app",
				tabId: null,
			},
			{
				targetId: chatPaneOf(tree)?.id ?? null,
				side: "right",
			},
		);

		if (placed === null) {
			return;
		}

		const reason = paneTransitionOf(tree, placed.tree, "open the shown tab beside the chat");
		paneTree.saveTree(placed.tree, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const CloseShownTabPaneCommand = command("close-shown-tab-pane")
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery, PlacementPreviewQuery])
	.inject({ paneTree: PaneTreeGateway })
	.handle((_input, { paneTree }) => {
		const tree = paneTree.tree();
		const shown = shownTabPaneOf(tree);

		if (shown === null) {
			console.info("[widgetarium] close the shown tab pane skipped: none stands");
			return;
		}

		const next = treeWithoutPane(tree, shown.id);
		const reason = paneTransitionOf(tree, next, `close the shown tab pane ${shown.id}`);
		paneTree.saveTree(next, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const ClosePanesOfTabsCommand = command("close-panes-of-tabs")
	.input(z.object({ tabIds: z.array(z.string()).readonly() }))
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery, PlacementPreviewQuery])
	.inject({ paneTree: PaneTreeGateway })
	.handle(({ tabIds }, { paneTree }) => {
		const tree = paneTree.tree();
		const paneIds = tabPaneIdsOf(tree, tabIds);

		if (paneIds.length === 0) {
			return;
		}

		const next = treeWithoutPanes(tree, paneIds);
		const reason = paneTransitionOf(tree, next, `close the panes of tabs ${tabIds.join(", ")}`);
		paneTree.saveTree(next, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const DropGoneTabsCommand = command("drop-gone-tabs")
	.input(z.object({ heldTabIds: z.array(z.string()).readonly() }))
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery, PlacementPreviewQuery])
	.inject({ paneTree: PaneTreeGateway })
	.handle(({ heldTabIds }, { paneTree }) => {
		const tree = paneTree.tree();
		const gonePanes = goneTabPanesOf(tree, new Set(heldTabIds));

		if (gonePanes.length === 0) {
			return;
		}

		const next = treeWithoutGoneTabs(tree, gonePanes);
		const reason = paneTransitionOf(tree, next, goneTabsWords(gonePanes.map(({ tabId }) => tabId)));
		paneTree.saveTree(next, reason);
		console.info(`[widgetarium] ${reason}`);
	});
