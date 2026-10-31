import { z } from "zod";
import {
	CaseResultSchema,
	MOST_BLOCKERS,
	MOST_CRITERIA,
	MOST_STEPS,
	DocKindSchema,
	StepStateSchema,
	TaskKindSchema,
	TaskStatusSchema,
} from "./task.schema.js";
import { ClosedOrderSchema, ClosedWithinSchema, UpdatedWithinSchema } from "./task-view.schema.js";

export const TaskRefSchema = z.string().min(1).max(20);

export const ChatIdSchema = z.string().min(1).max(200);

export const BoardAskSchema = z.object({
	closedWithin: ClosedWithinSchema.default("day"),
	closedOrder: ClosedOrderSchema.default("newest"),
	kind: TaskKindSchema.nullable().default(null),
	owner: ChatIdSchema.nullable().default(null),
	isYourTurnOnly: z.boolean().default(false),
});

export type BoardAsk = z.infer<typeof BoardAskSchema>;

export const TasksAskSchema = z.object({
	status: z.array(TaskStatusSchema).max(8).default([]),
	updatedWithin: UpdatedWithinSchema.default("week"),
	owner: ChatIdSchema.nullable().default(null),
	kind: TaskKindSchema.nullable().default(null),
	asking: ChatIdSchema.nullable().default(null),
	cursor: z.string().max(20).nullable().default(null),
	limit: z.number().int().positive().max(200).default(50),
});

export type TasksAsk = z.infer<typeof TasksAskSchema>;

export const TaskAskSchema = z.object({
	task: TaskRefSchema,
});

export const SearchAskSchema = z.object({
	query: z.string().min(1).max(300),
	includeClosed: z.boolean().default(false),
});

export type SearchAsk = z.infer<typeof SearchAskSchema>;

export const ChatAskSchema = z.object({
	chat: ChatIdSchema,
});

export const CreateTaskAskSchema = z.object({
	chat: ChatIdSchema,
	title: z.string().trim().min(1).max(200),
	description: z.string().max(40000).default(""),
	kind: TaskKindSchema,
	acceptance: z.array(z.string().trim().min(1).max(500)).max(MOST_CRITERIA).default([]),
	plan: z.array(z.string().trim().min(1).max(500)).max(MOST_STEPS).default([]),
	status: z.enum(["backlog", "todo"]).default("todo"),
	parent: TaskRefSchema.nullable().default(null),
	blockedBy: z.array(TaskRefSchema).max(MOST_BLOCKERS).default([]),
});

export type CreateTaskAsk = z.infer<typeof CreateTaskAskSchema>;

export const EditTaskAskSchema = z.object({
	chat: ChatIdSchema,
	task: TaskRefSchema,
	title: z.string().trim().min(1).max(200).nullable().default(null),
	description: z.string().max(40000).nullable().default(null),
	kind: TaskKindSchema.nullable().default(null),
	addCriteria: z.array(z.string().trim().min(1).max(500)).max(MOST_CRITERIA).default([]),
	addSteps: z.array(z.string().trim().min(1).max(500)).max(MOST_STEPS).default([]),
	blockedBy: z.array(TaskRefSchema).max(MOST_BLOCKERS).nullable().default(null),
});

export type EditTaskAsk = z.infer<typeof EditTaskAskSchema>;

export const StartTaskAskSchema = z.object({
	chat: ChatIdSchema,
	task: TaskRefSchema,
});

export type StartTaskAsk = z.infer<typeof StartTaskAskSchema>;

export const MarkStepAskSchema = z.object({
	chat: ChatIdSchema,
	task: TaskRefSchema,
	step: z.string().trim().min(1).max(500),
	state: StepStateSchema,
	note: z.string().max(600).nullable().default(null),
});

export type MarkStepAsk = z.infer<typeof MarkStepAskSchema>;

export const CheckCriterionAskSchema = z.object({
	chat: ChatIdSchema,
	task: TaskRefSchema,
	criterion: z.string().trim().min(1).max(12),
	state: z.enum(["open", "met", "dropped"]),
	evidence: z.string().trim().max(1000).nullable().default(null),
	reason: z.string().trim().max(600).nullable().default(null),
});

export type CheckCriterionAsk = z.infer<typeof CheckCriterionAskSchema>;

export const AttachedItemSchema = z.discriminatedUnion("type", [
	z.object({
		type: z.literal("workplace"),
		folder: z.string().trim().min(1).max(1000),
		branch: z.string().trim().max(300).nullable().default(null),
		worktree: z.string().trim().max(1000).nullable().default(null),
	}),
	z.object({
		type: z.literal("document"),
		kind: DocKindSchema,
		title: z.string().trim().min(1).max(200),
		path: z.string().trim().max(1000).nullable().default(null),
		body: z.string().max(40000).nullable().default(null),
	}),
	z.object({
		type: z.literal("test_plan"),
		stand: z.string().trim().min(1).max(600),
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
		results: z.record(z.string(), CaseResultSchema),
		failures: z.record(z.string(), z.string().max(2000)).default({}),
		screenshots: z.array(z.string().trim().min(1).max(1000)).max(20).default([]),
	}),
]);

export type AttachedItem = z.infer<typeof AttachedItemSchema>;

export const AttachToTaskAskSchema = z.object({
	chat: ChatIdSchema,
	task: TaskRefSchema,
	item: AttachedItemSchema,
});

export type AttachToTaskAsk = z.infer<typeof AttachToTaskAskSchema>;

export const MoveTaskAskSchema = z.object({
	chat: ChatIdSchema,
	task: TaskRefSchema,
	to: TaskStatusSchema,
	note: z.string().trim().max(600).nullable().default(null),
	blocker: z.enum(["task", "external"]).nullable().default(null),
});

export type MoveTaskAsk = z.infer<typeof MoveTaskAskSchema>;

export const ContinueAskSchema = z.object({
	task: TaskRefSchema,
	chat: ChatIdSchema.nullable(),
});

export type ContinueAsk = z.infer<typeof ContinueAskSchema>;

export const SendBackAskSchema = z.object({
	task: TaskRefSchema,
	note: z.string().trim().min(1).max(500),
	chat: ChatIdSchema.nullable(),
});

export type SendBackAsk = z.infer<typeof SendBackAskSchema>;

export const UndeliveredAskSchema = z.object({
	task: TaskRefSchema,
	reason: z.string().trim().min(1).max(600),
});

export type UndeliveredAsk = z.infer<typeof UndeliveredAskSchema>;

export const TurnEndedSchema = z.enum(["done", "stopped", "failed", "compact"]);

export type TurnEnded = z.infer<typeof TurnEndedSchema>;

export const TurnFailureKindSchema = z.enum(["silent", "usage_limit", "other"]);

export type TurnFailureKind = z.infer<typeof TurnFailureKindSchema>;

export const TurnStarterSchema = z.enum(["person", "host"]);

export type TurnStarter = z.infer<typeof TurnStarterSchema>;

export const SettleTurnAskSchema = z.object({
	chat: ChatIdSchema,
	turn: z.string().min(1).max(200),
	ended: TurnEndedSchema,
	turnStartedAt: z.number(),
	startedBy: TurnStarterSchema,
	isDrafted: z.boolean().default(false),
	isBusy: z.boolean().default(false),
	failure: z
		.object({
			kind: TurnFailureKindSchema,
			detail: z.string(),
			resumesAt: z.number().nullable().default(null),
		})
		.nullable()
		.default(null),
});

export type SettleTurnAsk = z.infer<typeof SettleTurnAskSchema>;

export const ReleaseChatAskSchema = z.object({
	chat: ChatIdSchema,
	why: z.enum(["cleared", "deleted"]),
});

export type ReleaseChatAsk = z.infer<typeof ReleaseChatAskSchema>;

export const ReconcileAskSchema = z.object({
	liveChats: z.array(ChatIdSchema).max(500),
});

export type ReconcileAsk = z.infer<typeof ReconcileAskSchema>;
