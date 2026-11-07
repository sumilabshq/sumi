import { z } from "zod";
import { Repeatable } from "@widgetarium/data-framework";
import { command } from "#module";
import { PaneTreeQuery, PlacementPreviewQuery } from "../../generated/contract.js";
import { treeFocusingSplit, treeLeavingSplit, treeShowingSplit } from "../../shared/lib/split-boards.js";
import { paneTransitionOf } from "../../shared/lib/pane-words.js";
import { SplitDrawingSchema } from "../../shared/schema/pane-tree.schema.js";

export const ShowSplitCommand = command("show-split")
	.public()
	.input(SplitDrawingSchema)
	.idempotencyKey(Repeatable)
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
	.public()
	.idempotencyKey(Repeatable)
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
	.public()
	.input(z.object({ focusedId: z.string().min(1) }))
	.idempotencyKey(Repeatable)
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
