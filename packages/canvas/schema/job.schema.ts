import { z } from "zod";
import { JobSchema } from "@widgetarium/core/app-jobs.js";

export type { Job } from "@widgetarium/core/app-jobs.js";

export const LiveJobSchema = z.object({
	activity: z.string().nullable(),
	lines: z.array(z.string()).readonly(),
	spent: z.number(),
});

export const ShownJobSchema = z.object({ job: JobSchema, spent: z.number() });

export type LiveJob = z.output<typeof LiveJobSchema>;
export type ShownJob = z.output<typeof ShownJobSchema>;
