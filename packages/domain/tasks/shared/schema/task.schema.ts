import { z } from "zod";

export const MOST_CRITERIA = 50;
export const MOST_STEPS = 100;
export const MOST_BLOCKERS = 20;
export const MOST_CHATS = 50;
export const MOST_PROGRESSED = 150;

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

export type TaskStatus = z.infer<typeof TaskStatusSchema>;

export const TaskKindSchema = z.enum(["code", "research", "design", "ops"]);

export type TaskKind = z.infer<typeof TaskKindSchema>;

export const BlockerKindSchema = z.enum([
	"session_silent",
	"session_failed",
	"usage_limit",
	"stalled",
	"interrupted",
	"task",
	"external",
]);

export type BlockerKind = z.infer<typeof BlockerKindSchema>;

export const BlockerSchema = z.object({
	kind: BlockerKindSchema,
	detail: z.string().max(600),
	resumesAt: z.number().nullable().default(null),
});

export type Blocker = z.infer<typeof BlockerSchema>;

export const CriterionStateSchema = z.enum(["open", "met", "dropped"]);

export type CriterionState = z.infer<typeof CriterionStateSchema>;

export const CriterionSchema = z.object({
	id: z.string().min(1).max(12),
	text: z.string().min(1).max(500),
	state: CriterionStateSchema,
	evidence: z.string().max(1000).nullable(),
	reason: z.string().max(600).nullable(),
});

export type Criterion = z.infer<typeof CriterionSchema>;

export const StepStateSchema = z.enum(["pending", "active", "done", "skipped", "blocked", "cancelled"]);

export type StepState = z.infer<typeof StepStateSchema>;

export const StepSchema = z.object({
	id: z.string().min(1).max(12),
	text: z.string().min(1).max(500),
	state: StepStateSchema,
	note: z.string().max(600).nullable(),
	by: z.string().max(200).nullable(),
});

export type Step = z.infer<typeof StepSchema>;

export const CaseResultSchema = z.enum(["passed", "failed", "skipped", "needs_you"]);

export type CaseResult = z.infer<typeof CaseResultSchema>;

export const TestCaseSchema = z.object({
	id: z.string().min(1).max(12),
	text: z.string().min(1).max(500),
	expect: z.string().max(500),
});

export type TestCase = z.infer<typeof TestCaseSchema>;

export const TestRunSchema = z.object({
	at: z.number(),
	results: z.record(z.string(), CaseResultSchema),
	failures: z.record(z.string(), z.string().max(2000)),
	screenshots: z.array(z.string().min(1).max(1000)).max(20),
	by: z.string().max(200),
});

export type TestRun = z.infer<typeof TestRunSchema>;

export const TestPlanSchema = z.object({
	stand: z.string().min(1).max(600),
	cases: z.array(TestCaseSchema).max(40),
	runs: z.array(TestRunSchema).max(20),
});

export type TestPlan = z.infer<typeof TestPlanSchema>;

export const DocKindSchema = z.enum(["spec", "research", "plan", "design", "notes"]);

export type DocKind = z.infer<typeof DocKindSchema>;

export const TaskDocSchema = z.object({
	id: z.string().min(1).max(12),
	kind: DocKindSchema,
	title: z.string().min(1).max(200),
	path: z.string().max(1000).nullable(),
	body: z.string().max(40000).nullable(),
	by: z.string().max(200),
	at: z.number(),
});

export type TaskDoc = z.infer<typeof TaskDocSchema>;

export const WorkplaceSchema = z.object({
	folder: z.string().min(1).max(1000),
	branch: z.string().max(300).nullable(),
	worktree: z.string().max(1000).nullable(),
	at: z.number(),
});

export type Workplace = z.infer<typeof WorkplaceSchema>;

export const ActorSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("agent"),
		chat: z.string().min(1).max(200),
	}),
	z.object({
		kind: z.literal("person"),
	}),
	z.object({
		kind: z.literal("host"),
	}),
]);

export type Actor = z.infer<typeof ActorSchema>;

export const TransitionSchema = z.object({
	from: TaskStatusSchema.nullable(),
	to: TaskStatusSchema,
	by: ActorSchema,
	reason: z.string().max(1000),
	at: z.number(),
});

export type Transition = z.infer<typeof TransitionSchema>;

export const TaskSchema = z.object({
	number: z.number().int().positive(),
	title: z.string().min(1).max(200),
	description: z.string().max(40000),
	kind: TaskKindSchema,
	status: TaskStatusSchema,
	blocker: BlockerSchema.nullable(),
	parent: z.number().int().positive().nullable(),
	blockedBy: z.array(z.number().int().positive()).max(MOST_BLOCKERS),
	acceptance: z.array(CriterionSchema).max(MOST_CRITERIA),
	plan: z.array(StepSchema).max(MOST_STEPS),
	testPlan: TestPlanSchema.nullable(),
	documents: z.array(TaskDocSchema).max(30),
	workplaces: z.array(WorkplaceSchema).max(20),
	owner: z.string().max(200).nullable(),
	chats: z.array(z.string().max(200)).max(MOST_CHATS),
	createdBy: z.string().max(200),
	createdAt: z.number(),
	updatedAt: z.number(),
	keptAt: z.number().nullable(),
	nudges: z.number().int().nonnegative(),
	progressed: z.array(z.string().min(1).max(12)).max(MOST_PROGRESSED).default([]),
	log: z.array(TransitionSchema).max(200),
});

export type Task = z.infer<typeof TaskSchema>;

export const BoardSchema = z.object({
	nextNumber: z.number().int().positive(),
	tasks: z.array(TaskSchema),
});

export type Board = z.infer<typeof BoardSchema>;
