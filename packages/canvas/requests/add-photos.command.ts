import { z } from "zod";
import { command } from "@widgetarium/core/mediator";

export const AddPhotosCommand = command("canvas/add-photos")
	.input(z.object({ photos: z.array(z.instanceof(File)) }))
	.idempotencyKey("per-call");
