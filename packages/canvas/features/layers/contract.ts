import { z } from "zod";
import { PerCall, Repeatable, command, query } from "@widgetarium/core/requests";
import { LayerSchema } from "../../shared/schema/layer.schema.js";
import { StatePictureSchema } from "../../shared/schema/design.schema.js";
import { LayerRowSchema } from "../../shared/schema/layer-row.schema.js";

export const KeepSeenLayersCommand = command("canvas/keep-seen-layers")
	.input(z.object({ key: z.string(), layers: z.array(LayerSchema).readonly() }))
	.idempotencyKey(Repeatable);

export const LayersPanelQuery = query("canvas/layers-panel").output(
	z.object({
		isDrawn: z.boolean(),
		isShown: z.boolean(),
		isLocked: z.boolean(),
		hasPicture: z.boolean(),
		treeKey: z.string(),
		picked: z.string().nullable(),
		liveCopy: StatePictureSchema.nullable(),
		rows: z.array(LayerRowSchema).readonly(),
	}),
);

export const LayersToggleQuery = query("canvas/layers-toggle").output(
	z.object({ isShown: z.boolean(), isOpen: z.boolean() }),
);

export const MoveLayerCommand = command("canvas/move-layer")
	.input(z.object({ dragged: z.string(), parent: z.string(), before: z.string().nullable() }))
	.idempotencyKey(PerCall);

export const PickLayerCommand = command("canvas/pick-layer")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable);

export const ToggleLayerFoldCommand = command("canvas/toggle-layer-fold")
	.input(z.object({ id: z.string() }))
	.idempotencyKey(Repeatable);

export const ToggleLayersCommand = command("canvas/toggle-layers").idempotencyKey(Repeatable);

export const ToggleLayoutLockCommand = command("canvas/toggle-layout-lock").idempotencyKey(Repeatable);
