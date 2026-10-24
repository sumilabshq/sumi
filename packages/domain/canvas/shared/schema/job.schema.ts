import { z } from "zod";

export const JobQuestionSchema = z.object({
	said: z.string(),
	options: z.array(z.string()),
});

export const JobSchema = z.object({
	id: z.string(),
	app: z.string(),
	title: z.string(),
	page: z.string().nullable(),
	phase: z.enum(["design", "implement", "review", "task"]),
	says: z.string(),
	after: z.array(z.string()),
	status: z.enum(["queued", "running", "paused", "waiting", "done", "failed"]),
	reason: z.string().nullable(),
	question: JobQuestionSchema.nullable(),
	session: z.string().nullable(),
	notes: z.array(z.string()),
	budget: z.number().nullable(),
	spent: z.number(),
	activity: z.string().nullable(),
	said: z.string().nullable(),
	widgets: z.array(z.string()),
	createdAt: z.number(),
	startedAt: z.number().nullable(),
	endedAt: z.number().nullable(),
});

export const ShownJobSchema = z.object({
	job: JobSchema,
	spent: z.number(),
});

export const JobStatusSchema = z.object({ shown: ShownJobSchema.nullable() });

export const JobIdSchema = z.object({ id: z.string() });

export const LiveJobSchema = z.object({
	activity: z.string().nullable(),
	lines: z.array(z.string()).readonly(),
	spent: z.number(),
});

export type Job = z.output<typeof JobSchema>;
export type LiveJob = z.output<typeof LiveJobSchema>;
