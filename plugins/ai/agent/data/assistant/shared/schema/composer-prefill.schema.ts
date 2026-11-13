import { z } from "zod";
import { ChatKeySchema } from "./chat-key.schema.js";

export const ComposerPrefillSchema = z.object({
	id: z.number(),
	text: z.string(),
});

export type ComposerPrefill = z.infer<typeof ComposerPrefillSchema>;

export const PrefillAskedSchema = ChatKeySchema.extend({ text: z.string().trim().min(1) });

export const PrefillTakenSchema = ChatKeySchema.extend({ id: z.number() });
