import { z } from "zod";

export const AgentEventSchema = z.enum([
	"typing",
	"sent",
	"toolStarted",
	"toolFinished",
	"asked",
	"answered",
	"failed",
	"runFinished",
]);

export type AgentEvent = z.infer<typeof AgentEventSchema>;

export const AgentEventsSchema = z.object({
	events: z.array(AgentEventSchema).min(1),
});

export const AgentActivitySchema = z.object({
	isRunning: z.boolean().default(false),
	toolsRunning: z.number().int().min(0).default(0),
	isAsking: z.boolean().default(false),
	typedAt: z.number().default(0),
	finishedAt: z.number().default(0),
	failedAt: z.number().default(0),
	lastAt: z.number().default(0),
});

export type AgentActivity = z.infer<typeof AgentActivitySchema>;
