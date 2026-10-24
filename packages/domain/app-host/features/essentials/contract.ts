import { z } from "zod";
import { Repeatable, command } from "@widgetarium/core/requests";
import { TabDropSchema } from "../../shared/schema/tab-drop.schema.js";

const EssentialIdSchema = z.object({ id: z.string() });

export const ShowEssentialCommand = command("app-host/show-essential")
	.input(EssentialIdSchema)
	.idempotencyKey(Repeatable);

export const RemoveEssentialCommand = command("app-host/remove-essential")
	.input(EssentialIdSchema)
	.idempotencyKey(Repeatable);

export const CloseEssentialCommand = command("app-host/close-essential")
	.input(EssentialIdSchema)
	.idempotencyKey(Repeatable);

export const PlaceEssentialCommand = command("app-host/place-essential")
	.input(EssentialIdSchema.extend({ to: TabDropSchema }))
	.idempotencyKey(Repeatable);
