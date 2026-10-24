import { z } from "zod";
import { InkReadingSchema } from "./browser-tab.schema.js";

export const InkActivitySchema = z.object({
	reading: InkReadingSchema.nullable(),
	contentReadAt: z.number().nullable(),
	stoppedAt: z.number().nullable(),
});

export type InkActivity = z.infer<typeof InkActivitySchema>;
