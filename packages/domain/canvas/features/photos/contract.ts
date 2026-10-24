import { z } from "zod";
import { PerCall, command } from "@widgetarium/core/requests";

export const AddPhotosCommand = command("canvas/add-photos")
	.input(z.object({ photos: z.array(z.instanceof(File)) }))
	.idempotencyKey(PerCall);

export const PastePhotosCommand = command("canvas/paste-photos")
	.input(z.object({ photos: z.array(z.instanceof(File)) }))
	.output(z.object({ isTaken: z.boolean() }))
	.idempotencyKey(PerCall);
