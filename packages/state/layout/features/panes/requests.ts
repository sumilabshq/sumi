import { z } from "zod";
import { Repeatable, command, query, refuse, subscriber } from "@widgetarium/core/requests";
import { PanesChangedEvent } from "../../gateways/pane-tree/pane-tree.events.js";
import { PaneTreeGateway } from "../../gateways/pane-tree/pane-tree.gateway.js";
import { PaneBoardSchema, PanePlacementSchema, PlacementPreviewSchema } from "../../shared/schema/pane-tree.schema.js";
import {
	boardOf,
	isAimable,
	placedTreeOf,
	refuseUnknownEdge,
	refuseUnknownPane,
	shareAt,
	treeWithoutPane,
	withSplitShare,
	withTarget,
} from "../../shared/lib/pane-trees.js";
import { paneTransitionOf, viewWords } from "../../shared/lib/pane-words.js";

export const PaneTreeQuery = query("pane-tree")
	.output(PaneBoardSchema)
	.settlesNow()
	.inject({ paneTree: PaneTreeGateway })
	.handle((_input, { paneTree }) => boardOf(paneTree.tree()));

export const PlacementPreviewQuery = query("placement-preview")
	.input(PanePlacementSchema.nullable())
	.output(PlacementPreviewSchema.nullable())
	.settlesNow()
	.inject({ paneTree: PaneTreeGateway })
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

export const PlacePaneCommand = command("place-pane")
	.input(PanePlacementSchema)
	.idempotencyKey(Repeatable)
	.inject({ paneTree: PaneTreeGateway })
	.handle(({ view, targetId, side }, { paneTree, invalidate }) => {
		invalidate(PaneTreeQuery);
		invalidate(PlacementPreviewQuery);
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

export const ClosePaneCommand = command("close-pane")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject({ paneTree: PaneTreeGateway })
	.handle(({ id }, { paneTree, invalidate }) => {
		invalidate(PaneTreeQuery);
		invalidate(PlacementPreviewQuery);
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

export const ResizePaneSplitCommand = command("resize-pane-split")
	.input(
		z.object({
			splitId: z.string(),
			at: z.number().int().nonnegative(),
			share: z.number().nonnegative(),
		}),
	)
	.idempotencyKey(Repeatable)
	.inject({ paneTree: PaneTreeGateway })
	.handle((asked, { paneTree, invalidate }) => {
		invalidate(PaneTreeQuery);
		invalidate(PlacementPreviewQuery);
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

export const AimPaneCommand = command("aim-pane")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.inject({ paneTree: PaneTreeGateway })
	.handle(({ id }, { paneTree, invalidate }) => {
		invalidate(PaneTreeQuery);
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

export const PanesOnPanesChangedSubscriber = subscriber(PanesChangedEvent).handle((_input, { invalidate }) => {
	invalidate(PaneTreeQuery);
	invalidate(PlacementPreviewQuery);
});
