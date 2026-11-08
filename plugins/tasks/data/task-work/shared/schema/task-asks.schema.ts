import { z } from "zod";

export const TaskRefSchema = z.string().min(1).max(20).describe("Task id, e.g. T-12.");

export const TaskKindSchema = z.enum(["code", "research", "design", "ops"]);

export const TaskStatusSchema = z.enum([
	"backlog",
	"todo",
	"in_progress",
	"ready_to_test",
	"done",
	"paused",
	"blocked",
	"cancelled",
]);

export const ListedTasksAskSchema = z.object({
	status: z.array(TaskStatusSchema).max(8).default([]).describe("Only these statuses."),
	updatedWithin: z.enum(["day", "week", "month", "all"]).default("week").describe("day, week (default), month or all."),
	owner: z.string().min(1).max(200).nullable().default(null).describe("Only tasks owned by this chat id."),
	kind: TaskKindSchema.nullable().default(null),
	cursor: z.string().max(20).nullable().default(null).describe("next from the previous page."),
	limit: z.number().int().positive().max(200).default(50),
});

export const OneTaskAskSchema = z.object({
	task: TaskRefSchema,
});

export const SearchedTasksAskSchema = z.object({
	query: z.string().min(1).max(300).describe("Words to look for."),
	includeClosed: z.boolean().default(false).describe("Also search done and cancelled tasks (default false)."),
});

export const NewTaskAskSchema = z.object({
	title: z.string().trim().min(1).max(200).describe("What will be true when it is done, in a few words."),
	description: z.string().max(40000).nullish().describe("The ask and its context."),
	kind: TaskKindSchema,
	acceptance: z
		.array(z.string().trim().min(1).max(500))
		.max(50)
		.nullish()
		.describe("Criteria from the person's ask, each checkable."),
	plan: z.array(z.string().trim().min(1).max(500)).max(100).nullish().describe("Steps in order."),
	status: z
		.enum(["backlog", "todo"])
		.nullish()
		.describe("todo (default) or backlog for work you found but were not asked to do."),
	parent: TaskRefSchema.nullable().default(null).describe("Id of the task this one is part of."),
	blockedBy: z.array(TaskRefSchema).max(20).nullish().describe("Ids of tasks that must close first."),
});

export const TaskEditAskSchema = z.object({
	task: TaskRefSchema,
	title: z.string().trim().min(1).max(200).nullable().default(null),
	description: z.string().max(40000).nullable().default(null),
	kind: TaskKindSchema.nullable().default(null),
	addCriteria: z.array(z.string().trim().min(1).max(500)).max(50).default([]),
	addSteps: z.array(z.string().trim().min(1).max(500)).max(100).default([]),
	blockedBy: z
		.array(TaskRefSchema)
		.max(20)
		.nullable()
		.default(null)
		.describe("Replaces the list of blocking task ids."),
});

export const StepMarkAskSchema = z.object({
	task: TaskRefSchema,
	step: z.string().trim().min(1).max(500).describe("Step id (S1) or its exact text."),
	state: z.enum(["pending", "active", "done", "skipped", "blocked", "cancelled"]),
	note: z.string().max(600).nullable().default(null),
});

export const CriterionCheckAskSchema = z.object({
	task: TaskRefSchema,
	criterion: z.string().trim().min(1).max(12).describe("Criterion id, e.g. C1."),
	state: z.enum(["open", "met", "dropped"]),
	evidence: z.string().trim().max(1000).nullable().default(null),
	reason: z.string().trim().max(600).nullable().default(null),
});

export const AttachedItemSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("workplace"),
		folder: z.string().trim().min(1).max(1000),
		branch: z.string().trim().max(300).nullable().default(null),
		worktree: z.string().trim().max(1000).nullable().default(null),
	}),
	z.object({
		type: z.literal("document"),
		kind: z.enum(["spec", "research", "plan", "design", "notes"]),
		title: z.string().trim().min(1).max(200),
		path: z.string().trim().max(1000).nullable().default(null),
		body: z.string().max(40000).nullable().default(null),
	}),
	z.object({
		type: z.literal("test_plan"),
		stand: z.string().trim().min(1).max(600).describe("Where and how to run it."),
		cases: z
			.array(
				z.object({
					text: z.string().trim().min(1).max(500),
					expect: z.string().trim().max(500).default(""),
				}),
			)
			.min(1)
			.max(40),
	}),
	z.object({
		type: z.literal("test_run"),
		results: z
			.record(z.string(), z.enum(["passed", "failed", "skipped", "needs_you"]))
			.describe("Case id to passed, failed, skipped or needs_you."),
		failures: z.record(z.string(), z.string().max(2000)).default({}),
		screenshots: z.array(z.string().trim().min(1).max(1000)).max(20).default([]),
	}),
]);

export const AttachAskSchema = z.object({
	task: TaskRefSchema,
	item: AttachedItemSchema,
});

export const TaskMoveAskSchema = z.object({
	task: TaskRefSchema,
	to: TaskStatusSchema,
	note: z.string().trim().max(600).nullable().default(null),
	blocker: z.enum(["task", "external"]).nullable().default(null),
});
