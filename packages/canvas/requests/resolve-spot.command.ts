import { z } from "zod";
import { command } from "@widgetarium/core/mediator";
import { SpotSchema } from "../schema/selection.schema.js";

export const ResolveSpotCommand = command("canvas/resolve-spot")
	.input(z.object({ spot: SpotSchema }))
	.idempotencyKey("none");
