import { z } from "zod";
import { Repeatable, command, query, refuse } from "@widgetarium/core/requests";
import { PaneTreeGateway } from "../../gateways/pane-tree/pane-tree.gateway.js";
import { PaneBoardSchema, PanePlacementSchema, PlacementPreviewSchema } from "../../shared/schema/pane-tree.schema.js";
import {
	boardOf,
	chatPaneOf,
	goneTabPanesOf,
	isAimable,
	paneShowingTab,
	placedTreeOf,
	refuseUnknownEdge,
	refuseUnknownPane,
	shareAt,
	shownTabPaneOf,
	tabPaneIdsOf,
	tabTargetOf,
	treeWithoutGoneTabs,
	treeWithoutPane,
	treeWithoutPanes,
	withSplitShare,
	withTabShown,
	withTarget,
} from "./lib/pane-trees.js";
import { goneTabsWords, paneTransitionOf, viewWords } from "./lib/pane-words.js";

const NO_TAB_TARGET = "the target pane is not an app pane showing a tab";

export const PaneTreeQuery = query("layout/pane-tree")
	.output(PaneBoardSchema)
	.settlesNow()
	.inject({ paneTree: PaneTreeGateway })
	.watch((_input, { paneTree }, changed) => paneTree.treeChanged(changed))
	.handle((_input, { paneTree }) => boardOf(paneTree.tree()));

export const PlacementPreviewQuery = query("layout/placement-preview")
	.input(PanePlacementSchema.nullable())
	.output(PlacementPreviewSchema.nullable())
	.settlesNow()
	.inject({ paneTree: PaneTreeGateway })
	.watch((_input, { paneTree }, changed) => paneTree.treeChanged(changed))
	.handle((placement, { paneTree }) => {
		if (placement === null) {
			return null;
		}

		const tree = paneTree.tree();
		const refusal = refuseUnknownPane(tree, placement.targetId);

		if (refusal !== null) {
			return null;
		}

		const placed = placedTreeOf(tree, placement.view, placement);
		return placed === null
			? null
			: {
					root: placed.tree.root,
					placedId: placed.placedId,
				};
	});

export const PlacePaneCommand = command("layout/place-pane")
	.input(PanePlacementSchema)
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery, PlacementPreviewQuery])
	.inject({ paneTree: PaneTreeGateway })
	.handle(({ view, targetId, side }, { paneTree }) => {
		const tree = paneTree.tree();
		const refusal = refuseUnknownPane(tree, targetId);

		if (refusal !== null) {
			return refuse(refusal);
		}

		const placed = placedTreeOf(tree, view, {
			targetId,
			side,
		});

		if (placed === null) {
			console.info(`[widgetarium] place ${viewWords(view)} skipped: it already stands in ${targetId ?? "the board"}`);
			return;
		}

		const reason = paneTransitionOf(
			tree,
			placed.tree,
			`place ${viewWords(view)} ${side} of ${targetId ?? "the board"}`,
		);
		paneTree.saveTree(placed.tree, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const ClosePaneCommand = command("layout/close-pane")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery, PlacementPreviewQuery])
	.inject({ paneTree: PaneTreeGateway })
	.handle(({ id }, { paneTree }) => {
		const tree = paneTree.tree();
		const refusal = refuseUnknownPane(tree, id);

		if (refusal !== null) {
			return refuse(refusal);
		}

		const next = treeWithoutPane(tree, id);
		const reason = paneTransitionOf(tree, next, `close ${id}`);
		paneTree.saveTree(next, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const ResizePaneSplitCommand = command("layout/resize-pane-split")
	.input(
		z.object({
			splitId: z.string(),
			at: z.number().int().nonnegative(),
			share: z.number().nonnegative(),
		}),
	)
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery, PlacementPreviewQuery])
	.inject({ paneTree: PaneTreeGateway })
	.handle((asked, { paneTree }) => {
		const tree = paneTree.tree();
		const refusal = refuseUnknownEdge(tree, asked);

		if (refusal !== null) {
			return refuse(refusal);
		}

		const next = withSplitShare(tree, asked);
		const was = shareAt(tree, asked).toFixed(3);
		const now = shareAt(next, asked).toFixed(3);
		paneTree.saveTree(next, `split ${asked.splitId} edge ${asked.at} ${was} → ${now} (drag)`);
	});

export const AimPaneCommand = command("layout/aim-pane")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery])
	.inject({ paneTree: PaneTreeGateway })
	.handle(({ id }, { paneTree }) => {
		const tree = paneTree.tree();
		const refusal = refuseUnknownPane(tree, id);

		if (refusal !== null) {
			return refuse(refusal);
		}

		if (!isAimable(tree, id)) {
			return;
		}

		const reason = `pane target ${tree.targetId ?? "none"} → ${id} (pressed)`;
		paneTree.saveTree(withTarget(tree, id), reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const ShowTabInTargetPaneCommand = command("layout/show-tab-in-target-pane")
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

export const OpenShownTabPaneCommand = command("layout/open-shown-tab-pane")
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

export const CloseShownTabPaneCommand = command("layout/close-shown-tab-pane")
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

export const ClosePanesOfTabsCommand = command("layout/close-panes-of-tabs")
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

export const DropGoneTabsCommand = command("layout/drop-gone-tabs")
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
