import { z } from "zod";
import { command } from "@widgetarium/core/mediator";

export const PickLayerCommand = command("canvas/pick-layer")
	.input(z.object({ id: z.string() }))
	.idempotencyKey("none");
