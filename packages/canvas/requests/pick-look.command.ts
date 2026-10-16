import { z } from "zod";
import { command } from "@widgetarium/core/mediator";

export const PickLookCommand = command("canvas/pick-look")
	.input(z.object({ settingName: z.string(), option: z.string() }))
	.idempotencyKey("per-call");
