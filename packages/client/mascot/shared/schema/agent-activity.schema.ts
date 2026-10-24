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

export const AgentActivitySchema = z.object({
	isRunning: z.boolean(),
	toolsRunning: z.number().int().min(0),
	isAsking: z.boolean(),
	typedAt: z.number(),
	finishedAt: z.number(),
	failedAt: z.number(),
	lastAt: z.number(),
});

export type AgentActivity = z.infer<typeof AgentActivitySchema>;
