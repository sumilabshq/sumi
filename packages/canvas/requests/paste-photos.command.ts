import { z } from "zod";
import { command } from "@widgetarium/core/mediator";

export const PastePhotosCommand = command("canvas/paste-photos")
	.input(z.object({ photos: z.array(z.instanceof(File)) }))
	.output(z.object({ isTaken: z.boolean() }))
	.idempotencyKey("per-call");
