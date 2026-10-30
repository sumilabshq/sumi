import { z } from "zod";
import { Repeatable, command } from "@widgetarium/core/requests";
import { PaneTreeGateway } from "../../gateways/pane-tree/pane-tree.gateway.js";
import { PaneTreeQuery, PlacementPreviewQuery } from "../../generated/contract.js";
import { treeFocusingSplit, treeLeavingSplit, treeShowingSplit } from "../../shared/lib/split-boards.js";
import { paneTransitionOf } from "../../shared/lib/pane-words.js";
import { SplitDrawingSchema } from "../../shared/schema/pane-tree.schema.js";

export const ShowSplitCommand = command("show-split")
	.input(SplitDrawingSchema)
	.idempotencyKey(Repeatable)
	.inject({ paneTree: PaneTreeGateway })
	.handle((drawing, { paneTree, invalidate }) => {
		invalidate(PaneTreeQuery);
		invalidate(PlacementPreviewQuery);
		const tree = paneTree.tree();
		const next = treeShowingSplit(tree, drawing);
		const reason = paneTransitionOf(tree, next, `show the split focused on ${drawing.focusedId}`);
		paneTree.saveTree(next, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const LeaveSplitCommand = command("leave-split")
	.idempotencyKey(Repeatable)
	.inject({ paneTree: PaneTreeGateway })
	.handle((_input, { paneTree, invalidate }) => {
		invalidate(PaneTreeQuery);
		invalidate(PlacementPreviewQuery);
		const tree = paneTree.tree();
		const next = treeLeavingSplit(tree);
		const reason = paneTransitionOf(tree, next, "the split leaves the board, its chats go to the shelf");
		paneTree.saveTree(next, reason);
		console.info(`[widgetarium] ${reason}`);
	});

export const FocusSplitCommand = command("focus-split")
	.input(z.object({ focusedId: z.string().min(1) }))
	.idempotencyKey(Repeatable)
	.inject({ paneTree: PaneTreeGateway })
	.handle(({ focusedId }, { paneTree, invalidate }) => {
		const tree = paneTree.tree();
		const next = treeFocusingSplit(tree, focusedId);

		if (next.targetId === tree.targetId && next.chatTargetId === tree.chatTargetId) {
			return;
		}

		invalidate(PaneTreeQuery);
		const reason = `split focus → ${focusedId}: app target ${tree.targetId ?? "none"} → ${next.targetId ?? "none"}, chat target ${tree.chatTargetId ?? "none"} → ${next.chatTargetId ?? "none"}`;
		paneTree.saveTree(next, reason);
		console.info(`[widgetarium] ${reason}`);
	});
