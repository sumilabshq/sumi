import { z } from "zod";
import { command } from "@widgetarium/core/mediator";

export const PickVariantCommand = command("canvas/pick-variant")
	.input(z.object({ screen: z.string() }))
	.idempotencyKey("none");
