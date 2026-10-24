import { z } from "zod";

export const ComposerPrefillSchema = z.object({
	id: z.number(),
	text: z.string(),
});

export type ComposerPrefill = z.infer<typeof ComposerPrefillSchema>;

export const PrefillAskedSchema = z.object({ text: z.string().trim().min(1) });
