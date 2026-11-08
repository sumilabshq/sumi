import { AuthenticatedGuard, Repeatable } from "@widgetarium/data-framework";
import { tasks } from "@widgetarium/tasks/contract";
import { command, query } from "#module";
import {
	AgentCardPageSchema,
	AgentCardsSchema,
	AgentCreatedSchema,
	AgentTaskSchema,
} from "../../shared/schema/agent-task.schema.js";
import {
	AttachAskSchema,
	CriterionCheckAskSchema,
	ListedTasksAskSchema,
	NewTaskAskSchema,
	OneTaskAskSchema,
	SearchedTasksAskSchema,
	StepMarkAskSchema,
	TaskEditAskSchema,
	TaskMoveAskSchema,
} from "../../shared/schema/task-asks.schema.js";
import { agentCardOf, agentTaskOf } from "./lib/agent-tasks.js";

export const search = query()
	.public()
	.metadata({
		description:
			"Search the workspace's tasks by words in their title and description. Run it before task-work_tasks_create: when an open task has the same goal, continue it instead of creating another.",
	})
	.input(SearchedTasksAskSchema)
	.output(AgentCardsSchema)
	.handle(async (asked, { send }) => (await send(tasks.board.search, asked)).map(agentCardOf));

export const all = query()
	.public()
	.metadata({
		description:
			"List the workspace's tasks, newest change first, a page at a time. Every agent's tasks are listed; filter by status, owner chat or kind.",
	})
	.input(ListedTasksAskSchema)
	.output(AgentCardPageSchema)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { send, user }) => {
		const page = await send(tasks.board.all, {
			...asked,
			asking: user.id,
		});
		return {
			items: page.items.map(agentCardOf),
			next: page.next,
			total: page.total,
		};
	});

export const one = query()
	.public()
	.metadata({
		description:
			"Read one task whole: its criteria, steps, documents, workplaces and status. This only reads it; to show the task to the person, link it as [title](sumi://task/T-12).",
	})
	.input(OneTaskAskSchema)
	.output(AgentTaskSchema)
	.handle(async (asked, { send }) => agentTaskOf(await send(tasks.board.one, asked)));

export const create = command()
	.public()
	.metadata({
		description:
			"Create a task on the workspace's board, owned by this chat. Create one when the work has 3+ distinct steps, changes code in more than one place or needs checking, is research with a written result, will outlive this turn, or is work you found but were not asked to do (status backlog). Do not create one for a question, a lookup, one small edit, or a side ask while a task is open: pause yours with task-work_tasks_move, answer, then task-work_tasks_start or task-work_tasks_move it back. Always task-work_tasks_search first and continue an open task with the same goal. Acceptance criteria come from the person's ask, in their words. One task in_progress per chat. Link it as [title](sumi://task/ID).",
	})
	.input(NewTaskAskSchema)
	.output(AgentCreatedSchema)
	.idempotencyKey(Repeatable)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { send, user }) => {
		const created = await send(tasks.agentWork.create, {
			...asked,
			description: asked.description ?? undefined,
			acceptance: asked.acceptance ?? undefined,
			plan: asked.plan ?? undefined,
			status: asked.status ?? undefined,
			blockedBy: asked.blockedBy ?? undefined,
			chat: user.id,
		});
		return {
			task: agentTaskOf(created.task),
			isExisting: created.isExisting,
		};
	});

export const update = command()
	.public()
	.metadata({
		description:
			"Edit this chat's task: title, description, kind, blockers; add criteria the person asked for or steps you found.",
	})
	.input(TaskEditAskSchema)
	.output(AgentTaskSchema)
	.idempotencyKey(Repeatable)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { send, user }) =>
		agentTaskOf(
			await send(tasks.agentWork.edit, {
				...asked,
				chat: user.id,
			}),
		),
	);

export const start = command()
	.public()
	.metadata({
		description:
			"Take a task and move it to in_progress in this chat. A code task needs its workplace attached first (task-work_tasks_attach). One task in_progress per chat: pause or move the current one first. The host will not let a turn end quietly while this chat owns a task in_progress.",
	})
	.input(OneTaskAskSchema)
	.output(AgentTaskSchema)
	.idempotencyKey(Repeatable)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { send, user }) =>
		agentTaskOf(
			await send(tasks.agentWork.start, {
				...asked,
				chat: user.id,
			}),
		),
	);

export const markStep = command()
	.public()
	.metadata({
		description:
			"Mark one step of this chat's task the moment it changes: active when you begin it, done when it is done. Never batch steps at the end. A step not in the plan is added. skipped, blocked and cancelled need a note saying why.",
	})
	.input(StepMarkAskSchema)
	.output(AgentTaskSchema)
	.idempotencyKey(Repeatable)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { send, user }) =>
		agentTaskOf(
			await send(tasks.agentWork.markStep, {
				...asked,
				chat: user.id,
			}),
		),
	);

export const checkCriterion = command()
	.public()
	.metadata({
		description:
			"Mark one acceptance criterion met, dropped or open again. Never mark met without evidence: a test run, a screenshot path, a commit, a document. Dropping needs the reason, in the person's words when they changed the ask.",
	})
	.input(CriterionCheckAskSchema)
	.output(AgentTaskSchema)
	.idempotencyKey(Repeatable)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { send, user }) =>
		agentTaskOf(
			await send(tasks.agentWork.checkCriterion, {
				...asked,
				chat: user.id,
			}),
		),
	);

export const attach = command()
	.public()
	.metadata({
		description:
			"Attach to this chat's task where the work happens (workplace), a written result (document), how to test it (test_plan) or a test run's results (test_run).",
	})
	.input(AttachAskSchema)
	.output(AgentTaskSchema)
	.idempotencyKey(Repeatable)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { send, user }) =>
		agentTaskOf(
			await send(tasks.agentWork.attach, {
				...asked,
				chat: user.id,
			}),
		),
	);

export const move = command()
	.public()
	.metadata({
		description:
			'Move this chat\'s task to another status. When the work is finished, move a code task to ready_to_test and say what to try. Done on a code task or from ready_to_test, reopening a done or cancelled task, and ready_to_test back to todo are the person\'s calls: make them only when the person said so in this chat ("approved", "reopen it"), and quote their words as the note. paused, blocked and cancelled need a note. A refused move lists what is still missing.',
	})
	.input(TaskMoveAskSchema)
	.output(AgentTaskSchema)
	.idempotencyKey(Repeatable)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { send, user }) =>
		agentTaskOf(
			await send(tasks.agentWork.move, {
				...asked,
				chat: user.id,
			}),
		),
	);
