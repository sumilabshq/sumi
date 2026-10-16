import { z } from "zod";
import { query } from "@widgetarium/core/mediator";
import { StatePictureSchema } from "../schema/design.schema.js";
import { LayerRowSchema } from "../lib/layers/layer-rows.js";

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
