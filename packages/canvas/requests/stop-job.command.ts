import { z } from "zod";
import { command } from "@widgetarium/core/mediator";

export const StopJobCommand = command("canvas/stop-job")
	.input(z.object({ id: z.string() }))
	.idempotencyKey("per-call");
