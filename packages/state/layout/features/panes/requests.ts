import { z } from "zod";
import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { panesChanged } from "../../gateways/pane-tree/pane-tree.events.js";
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

export const current = query()
	.public()
	.output(PaneBoardSchema)
	.settlesNow()
	.handle((_input, { paneTree }) => ({
		...boardOf(paneTree.tree(), paneTree.elsewhere()),
		isLoaded: paneTree.isLoaded(),
	}));

export const placementPreview = query()
	.public()
	.input(PanePlacementSchema.nullable())
	.output(PlacementPreviewSchema.nullable())
	.settlesNow()
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

export const place = command()
	.public()
	.input(PanePlacementSchema)
	.idempotencyKey(Repeatable)
	.handle((placement, { paneTree: paneTreeGateway, invalidate }) => {
		const { view, targetId, side } = placement;
		invalidate(current);
		invalidate(placementPreview);
		const tree = paneTreeGateway.tree();
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
		paneTreeGateway.saveTree(placed.tree, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const close = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(({ id }, { paneTree: paneTreeGateway, invalidate }) => {
		invalidate(current);
		invalidate(placementPreview);
		const tree = paneTreeGateway.tree();
		const refusal = refuseUnknownPane(tree, id);

		if (refusal !== null) {
			return refuse(refusal);
		}

		const next = treeWithoutPane(tree, id);
		const reason = paneTransitionOf(tree, next, `close ${id}`);
		paneTreeGateway.saveTree(next, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const resizeSplit = command()
	.public()
	.input(
		z.object({
			splitId: z.string(),
			at: z.number().int().nonnegative(),
			share: z.number().nonnegative(),
		}),
	)
	.idempotencyKey(Repeatable)
	.handle((asked, { paneTree: paneTreeGateway, invalidate }) => {
		invalidate(current);
		invalidate(placementPreview);
		const tree = paneTreeGateway.tree();
		const refusal = refuseUnknownEdge(tree, asked);

		if (refusal !== null) {
			return refuse(refusal);
		}

		const next = withSplitShare(tree, asked);
		const was = shareAt(tree, asked).toFixed(3);
		const now = shareAt(next, asked).toFixed(3);
		paneTreeGateway.saveTree(next, `split ${asked.splitId} edge ${asked.at} ${was} → ${now} (drag)`);
	});

export const aim = command()
	.public()
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.handle(({ id }, { paneTree: paneTreeGateway, invalidate }) => {
		invalidate(current);
		const tree = paneTreeGateway.tree();
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
		paneTreeGateway.saveTree(withTarget(tree, id, kind), reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const reread = subscriber(panesChanged).handle((_input, { invalidate }) => {
	invalidate(current);
	invalidate(placementPreview);
});

function refusePlacement(tree: PaneTree, { view, targetId, home }: PanePlacement): string | null {
	return (
		refuseUnknownPane(tree, targetId) ?? refuseHomeTarget(tree.root, homeOfPlacement(tree.root, view, home), targetId)
	);
}
