import { z } from "zod";

export { JobSchema } from "@widgetarium/core/app-jobs.js";
export type { Job } from "@widgetarium/core/app-jobs.js";

export const LiveJobSchema = z.object({
	activity: z.string().nullable(),
	lines: z.array(z.string()).readonly(),
	spent: z.number(),
});

export const JobAskedSchema = z.object({ id: z.string() });

export type LiveJob = z.output<typeof LiveJobSchema>;
