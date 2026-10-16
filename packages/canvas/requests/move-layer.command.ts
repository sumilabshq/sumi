import { z } from "zod";
import { command } from "@widgetarium/core/mediator";

export const MoveLayerCommand = command("canvas/move-layer")
	.input(z.object({ dragged: z.string(), parent: z.string(), before: z.string().nullable() }))
	.idempotencyKey("per-call");
