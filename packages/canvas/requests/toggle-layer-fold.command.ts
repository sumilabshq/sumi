import { z } from "zod";
import { command } from "@widgetarium/core/mediator";

export const ToggleLayerFoldCommand = command("canvas/toggle-layer-fold")
	.input(z.object({ id: z.string() }))
	.idempotencyKey("none");
