import { z } from "zod";
import { command } from "@widgetarium/core/mediator";

export const ShowPageCommand = command("canvas/show-page")
	.input(z.object({ page: z.string() }))
	.idempotencyKey("none");
