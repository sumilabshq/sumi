import { z } from "zod";
import { command } from "@widgetarium/core/mediator";
import { LayerSchema } from "../schema/layer.schema.js";

export const KeepSeenLayersCommand = command("canvas/keep-seen-layers")
	.input(z.object({ key: z.string(), layers: z.array(LayerSchema).readonly() }))
	.idempotencyKey("none");
