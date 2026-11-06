import { z } from "zod";
import { Repeatable, command, query, refuse, subscriber } from "@widgetarium/data-framework";
import { PanesChangedEvent } from "../../gateways/pane-tree/pane-tree.events.js";
import { PaneTreeGateway } from "../../gateways/pane-tree/pane-tree.gateway.js";
import { PaneBoardSchema, PanePlacementSchema, PlacementPreviewSchema } from "../../shared/schema/pane-tree.schema.js";
import {
	boardOf,
	isAimable,
	placedTreeOf,
	placementPreviewOf,
	refuseUnknownPane,
	treeWithoutPane,
	withTarget,
} from "../../shared/lib/pane-trees.js";
import { refuseUnknownEdge, shareAt, withSplitShare } from "../../shared/lib/pane-splits.js";
import { leavesOf } from "../../shared/lib/pane-nodes.js";
import { homeOfPlacement, refuseHomeTarget } from "../../shared/lib/chat-groups.js";
import type { PanePlacement, PaneTree } from "../../shared/schema/pane-tree.schema.js";
import { paneTransitionOf, viewWords } from "../../shared/lib/pane-words.js";

export const PaneTreeQuery = query("pane-tree")
	.output(PaneBoardSchema)
	.settlesNow()
	.inject({ paneTree: PaneTreeGateway })
	.handle((_input, { paneTree }) => ({
		...boardOf(paneTree.tree(), paneTree.elsewhere()),
		isLoaded: paneTree.isLoaded(),
	}));

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
		const refusal = refusePlacement(tree, placement);

		if (refusal !== null) {
			return null;
		}

		return placementPreviewOf(tree, placement.view, placement);
	});

export const PlacePaneCommand = command("place-pane")
	.input(PanePlacementSchema)
	.idempotencyKey(Repeatable)
	.inject({ paneTree: PaneTreeGateway })
	.handle((placement, { paneTree, invalidate }) => {
		const { view, targetId, side } = placement;
		invalidate(PaneTreeQuery);
		invalidate(PlacementPreviewQuery);
		const tree = paneTree.tree();
		const refusal = refusePlacement(tree, placement);

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

		const kind = leavesOf(tree.root).find((leaf) => leaf.id === id)?.view.kind;

		if (kind === undefined || !isAimable(tree, id)) {
			return;
		}

		const was = kind === "chat" ? tree.chatTargetId : tree.targetId;
		const reason = `${kind} pane target ${was ?? "none"} → ${id} (pressed)`;
		paneTree.saveTree(withTarget(tree, id, kind), reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const RereadPanesSubscriber = subscriber(PanesChangedEvent).handle((_input, { invalidate }) => {
	invalidate(PaneTreeQuery);
	invalidate(PlacementPreviewQuery);
});

function refusePlacement(tree: PaneTree, { view, targetId, home }: PanePlacement): string | null {
	return (
		refuseUnknownPane(tree, targetId) ?? refuseHomeTarget(tree.root, homeOfPlacement(tree.root, view, home), targetId)
	);
}
