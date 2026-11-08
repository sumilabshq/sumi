import { z } from "zod";

export const AgentCardSchema = z.object({
	id: z.string(),
	title: z.string(),
	kind: z.string(),
	status: z.string(),
	owner: z.string().nullable(),
	note: z.string().nullable(),
	blocker: z.string().nullable(),
	waitsFor: z.array(z.string()),
	steps: z.string(),
	criteria: z.string(),
	nextStep: z.string().nullable(),
	isStale: z.boolean(),
});

export type AgentCard = z.infer<typeof AgentCardSchema>;

export const AgentCardsSchema = z.array(AgentCardSchema);

export const AgentCardPageSchema = z.object({
	items: z.array(AgentCardSchema),
	next: z.string().nullable(),
	total: z.number().int().nonnegative(),
});

export const AgentTaskSchema = AgentCardSchema.extend({
	description: z.string(),
	parent: z.string().nullable(),
	acceptance: z.array(
		z.object({
			id: z.string(),
			text: z.string(),
			state: z.string(),
			evidence: z.string().nullable(),
		}),
	),
	plan: z.array(
		z.object({
			id: z.string(),
			text: z.string(),
			state: z.string(),
			note: z.string().nullable(),
		}),
	),
	documents: z.array(
		z.object({
			id: z.string(),
			kind: z.string(),
			title: z.string(),
			path: z.string().nullable(),
		}),
	),
	workplaces: z.array(
		z.object({
			folder: z.string(),
			branch: z.string().nullable(),
			worktree: z.string().nullable(),
		}),
	),
	testCases: z.number().int().nonnegative().nullable(),
});

export type AgentTask = z.infer<typeof AgentTaskSchema>;

export const AgentCreatedSchema = z.object({
	task: AgentTaskSchema,
	isExisting: z.boolean(),
});
