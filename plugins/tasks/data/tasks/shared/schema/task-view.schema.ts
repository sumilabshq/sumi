import { z } from "zod";
import {
	BlockerSchema,
	CriterionSchema,
	StepSchema,
	TaskDocSchema,
	TaskKindSchema,
	TaskStatusSchema,
	TestPlanSchema,
	TransitionSchema,
	WorkplaceSchema,
} from "./task.schema.js";

export const CountSchema = z.object({
	done: z.number().int().nonnegative(),
	total: z.number().int().nonnegative(),
});

export type Count = z.infer<typeof CountSchema>;

export const PersonActionSchema = z.enum(["accept", "send_back", "continue", "keep"]);

export type PersonAction = z.infer<typeof PersonActionSchema>;

export const TaskCardSchema = z.object({
	id: z.string(),
	number: z.number().int().positive(),
	title: z.string(),
	kind: TaskKindSchema,
	status: TaskStatusSchema,
	statusLabel: z.string(),
	isClosed: z.boolean(),
	note: z.string().nullable(),
	blocker: BlockerSchema.nullable(),
	continueAt: z.number().nullable(),
	waitsFor: z.array(z.string()),
	owner: z.string().nullable(),
	criteria: CountSchema,
	steps: CountSchema,
	tests: CountSchema.nullable(),
	branch: z.string().nullable(),
	nextStep: z.string().nullable(),
	isStale: z.boolean(),
	quietDays: z.number().int().nonnegative().nullable(),
	isYourTurn: z.boolean(),
	actions: z.array(PersonActionSchema),
	updatedAt: z.number(),
	closedAt: z.number().nullable(),
});

export type TaskCard = z.infer<typeof TaskCardSchema>;

export const LogEntrySchema = TransitionSchema.extend({
	fromLabel: z.string().nullable(),
	toLabel: z.string(),
});

export type LogEntry = z.infer<typeof LogEntrySchema>;

export const TaskViewSchema = z.object({
	card: TaskCardSchema,
	description: z.string(),
	parent: z.string().nullable(),
	acceptance: z.array(CriterionSchema),
	plan: z.array(StepSchema),
	testPlan: TestPlanSchema.nullable(),
	documents: z.array(TaskDocSchema),
	workplaces: z.array(WorkplaceSchema),
	chats: z.array(z.string()),
	createdBy: z.string(),
	createdAt: z.number(),
	log: z.array(LogEntrySchema),
});

export type TaskView = z.infer<typeof TaskViewSchema>;

export const BoardColumnSchema = z.object({
	status: TaskStatusSchema,
	label: z.string(),
	isClosed: z.boolean(),
	cards: z.array(TaskCardSchema),
	total: z.number().int().nonnegative(),
	count: z.number().int().nonnegative(),
	hidden: z.number().int().nonnegative(),
});

export type BoardColumn = z.infer<typeof BoardColumnSchema>;

export const ClosedWithinSchema = z.enum(["none", "day", "week", "month", "all"]);

export type ClosedWithin = z.infer<typeof ClosedWithinSchema>;

export const UpdatedWithinSchema = z.enum(["day", "week", "month", "all"]);

export type UpdatedWithin = z.infer<typeof UpdatedWithinSchema>;

export const ClosedOrderSchema = z.enum(["newest", "oldest"]);

export type ClosedOrder = z.infer<typeof ClosedOrderSchema>;

export const BoardAnswerSchema = z.object({
	columns: z.array(BoardColumnSchema),
	waitingForYou: z.number().int().nonnegative(),
	inProgress: z.number().int().nonnegative(),
});

export type BoardAnswer = z.infer<typeof BoardAnswerSchema>;

export const TaskPageSchema = z.object({
	items: z.array(TaskCardSchema),
	next: z.string().nullable(),
	total: z.number().int().nonnegative(),
});

export type TaskPage = z.infer<typeof TaskPageSchema>;

export const SearchHitsSchema = z.array(TaskCardSchema);

export const TurnTrailerSchema = z.object({
	trailer: z.string().nullable(),
});

export type TurnTrailer = z.infer<typeof TurnTrailerSchema>;

export const ChatTaskLineSchema = z.object({
	card: TaskCardSchema.nullable(),
	alsoOpen: z.number().int().nonnegative(),
});

export type ChatTaskLine = z.infer<typeof ChatTaskLineSchema>;

export const TurnFollowUpSchema = z.object({
	followUp: z
		.object({
			message: z.string(),
			task: z.string(),
		})
		.nullable(),
});

export type TurnFollowUp = z.infer<typeof TurnFollowUpSchema>;

export const ContinuedSchema = z.object({
	chat: z.string().nullable(),
	message: z.string(),
});

export type Continued = z.infer<typeof ContinuedSchema>;

export const CreatedSchema = z.object({
	task: TaskViewSchema,
	isExisting: z.boolean(),
});

export type Created = z.infer<typeof CreatedSchema>;

export const ChangedCountSchema = z.object({
	changed: z.number().int().nonnegative(),
});

export type ChangedCount = z.infer<typeof ChangedCountSchema>;
