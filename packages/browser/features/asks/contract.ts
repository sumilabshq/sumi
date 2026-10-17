import { z } from "zod";
import { Repeatable, command, query } from "@widgetarium/core/requests";
import { AccessAsksSchema, AskAnswerSchema } from "../../shared/schema/access-ask.schema.js";
import { InkReadingSchema } from "../../shared/schema/browser-tab.schema.js";

export const AccessAsksQuery = query("browser/access-asks").output(AccessAsksSchema).settlesNow();

export const AnswerAskCommand = command("browser/answer-ask")
	.input(
		z.object({
			id: z.string(),
			answer: AskAnswerSchema,
		}),
	)
	.idempotencyKey((input) => input.id)
	.invalidates([AccessAsksQuery]);

export const StopInkCommand = command("browser/stop-ink").idempotencyKey(Repeatable);

export const InkReadingQuery = query("browser/ink-reading").output(InkReadingSchema.nullable()).settlesNow();
