import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { PaneSideSchema, PaneTreeSchema, PaneViewSchema } from "../../shared/schema/pane-tree.schema.js";

export const PaneTreeQuery = query("shell/pane-tree").output(PaneTreeSchema).settlesNow();

export const PlacePaneCommand = command("shell/place-pane")
	.input(
		z.object({
			view: PaneViewSchema,
			targetId: z.string().nullable(),
			side: PaneSideSchema,
		}),
	)
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery]);

export const ClosePaneCommand = command("shell/close-pane")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery]);

export const ResizePaneSplitCommand = command("shell/resize-pane-split")
	.input(
		z.object({
			splitId: z.string(),
			at: z.number().int().nonnegative(),
			share: z.number().nonnegative(),
		}),
	)
	.idempotencyKey(Repeatable)
	.invalidates([PaneTreeQuery]);
