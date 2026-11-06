import type { z } from "zod";
import {
	AttachToTaskAskSchema,
	AttachToTaskCommand,
	CheckCriterionAskSchema,
	CheckCriterionCommand,
	CreateTaskAskSchema,
	CreateTaskCommand,
	EditTaskAskSchema,
	EditTaskCommand,
	MarkStepAskSchema,
	MarkStepCommand,
	MoveTaskAskSchema,
	MoveTaskCommand,
	SearchAskSchema,
	SearchTasksQuery,
	StartTaskAskSchema,
	StartTaskCommand,
	TaskAskSchema,
	TaskQuery,
	TasksAskSchema,
	TasksQuery,
} from "@widgetarium/tasks";
import type { TaskCard, TaskView } from "@widgetarium/tasks";
import { fieldsOf, inputOf, outputOf } from "./tool-places.js";
import type { ToolContext } from "./tool-places.js";

interface AgentCard {
	readonly id: string;
	readonly title: string;
	readonly kind: TaskCard["kind"];
	readonly status: TaskCard["status"];
	readonly owner: string | null;
	readonly note: string | null;
	readonly blocker: string | null;
	readonly waitsFor: readonly string[];
	readonly steps: string;
	readonly criteria: string;
	readonly nextStep: string | null;
	readonly isStale: boolean;
}

interface AgentTask extends AgentCard {
	readonly description: string;
	readonly parent: string | null;
	readonly acceptance: readonly Pick<TaskView["acceptance"][number], "id" | "text" | "state" | "evidence">[];
	readonly plan: readonly Pick<TaskView["plan"][number], "id" | "text" | "state" | "note">[];
	readonly documents: readonly Pick<TaskView["documents"][number], "id" | "kind" | "title" | "path">[];
	readonly workplaces: readonly Pick<TaskView["workplaces"][number], "folder" | "branch" | "worktree">[];
	readonly testCases: number | null;
}

export async function taskSearch({ app }: ToolContext, input: unknown): Promise<readonly AgentCard[]> {
	const asked = inputOf(SearchAskSchema, "task_search", fieldsOf("task_search", input));
	const hits = await outputOf(app.send(SearchTasksQuery, asked));
	return hits.map(agentCardOf);
}

export async function taskList({ app, chatId }: ToolContext, input: unknown) {
	const asked = inputOf(TasksAskSchema, "task_list", {
		...fieldsOf("task_list", input),
		asking: chatId,
	});
	const page = await outputOf(app.send(TasksQuery, asked));
	return {
		items: page.items.map(agentCardOf),
		next: page.next,
		total: page.total,
	};
}

export async function taskGet({ app }: ToolContext, input: unknown): Promise<AgentTask> {
	const asked = inputOf(TaskAskSchema, "task_get", fieldsOf("task_get", input));
	return agentTaskOf(await outputOf(app.send(TaskQuery, asked)));
}

export async function taskCreate(context: ToolContext, input: unknown) {
	const asked = askedByChat(CreateTaskAskSchema, "task_create", { context, input });
	const created = await outputOf(context.app.send(CreateTaskCommand, asked));
	return {
		task: agentTaskOf(created.task),
		isExisting: created.isExisting,
	};
}

export async function taskUpdate(context: ToolContext, input: unknown): Promise<AgentTask> {
	const asked = askedByChat(EditTaskAskSchema, "task_update", { context, input });
	return agentTaskOf(await outputOf(context.app.send(EditTaskCommand, asked)));
}

export async function taskStart(context: ToolContext, input: unknown): Promise<AgentTask> {
	const asked = askedByChat(StartTaskAskSchema, "task_start", { context, input });
	return agentTaskOf(await outputOf(context.app.send(StartTaskCommand, asked)));
}

export async function taskStep(context: ToolContext, input: unknown): Promise<AgentTask> {
	const asked = askedByChat(MarkStepAskSchema, "task_step", { context, input });
	return agentTaskOf(await outputOf(context.app.send(MarkStepCommand, asked)));
}

export async function taskCheck(context: ToolContext, input: unknown): Promise<AgentTask> {
	const asked = askedByChat(CheckCriterionAskSchema, "task_check", { context, input });
	return agentTaskOf(await outputOf(context.app.send(CheckCriterionCommand, asked)));
}

export async function taskAttach(context: ToolContext, input: unknown): Promise<AgentTask> {
	const asked = askedByChat(AttachToTaskAskSchema, "task_attach", { context, input });
	return agentTaskOf(await outputOf(context.app.send(AttachToTaskCommand, asked)));
}

export async function taskMove(context: ToolContext, input: unknown): Promise<AgentTask> {
	const asked = askedByChat(MoveTaskAskSchema, "task_move", { context, input });
	return agentTaskOf(await outputOf(context.app.send(MoveTaskCommand, asked)));
}

function askedByChat<Schema extends z.ZodType>(
	schema: Schema,
	tool: string,
	{ context, input }: { readonly context: ToolContext; readonly input: unknown },
): z.output<Schema> {
	return inputOf(schema, tool, {
		...fieldsOf(tool, input),
		chat: context.chatId,
	});
}

function agentCardOf(card: TaskCard): AgentCard {
	return {
		id: card.id,
		title: card.title,
		kind: card.kind,
		status: card.status,
		owner: card.owner,
		note: card.note,
		blocker: card.blocker === null ? null : `${card.blocker.kind}: ${card.blocker.detail}`,
		waitsFor: card.waitsFor,
		steps: `${card.steps.done}/${card.steps.total}`,
		criteria: `${card.criteria.done}/${card.criteria.total}`,
		nextStep: card.nextStep,
		isStale: card.isStale,
	};
}

function agentTaskOf(view: TaskView): AgentTask {
	return {
		...agentCardOf(view.card),
		description: view.description,
		parent: view.parent,
		acceptance: view.acceptance.map(({ id, text, state, evidence }) => ({ id, text, state, evidence })),
		plan: view.plan.map(({ id, text, state, note }) => ({ id, text, state, note })),
		documents: view.documents.map(({ id, kind, title, path }) => ({ id, kind, title, path })),
		workplaces: view.workplaces.map(({ folder, branch, worktree }) => ({ folder, branch, worktree })),
		testCases: view.testPlan === null ? null : view.testPlan.cases.length,
	};
}
