import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command } from "#module";
import { TasksGateway } from "../../gateways/tasks/tasks.gateway.js";
import { sameOpenTitleOf } from "../../shared/lib/board-views.js";
import { viewOf } from "../../shared/lib/task-cards.js";
import type { BoardStep } from "../../shared/lib/task-moves.js";
import { finderOfRef } from "../../shared/lib/task-refs.js";
import type { Board } from "../../shared/schema/task.schema.js";
import { AttachToTaskAskSchema, CheckCriterionAskSchema, CreateTaskAskSchema, EditTaskAskSchema, MarkStepAskSchema, MoveTaskAskSchema, StartTaskAskSchema } from "../../shared/schema/task-asks.schema.js";
import { CreatedSchema, TaskViewSchema } from "../../shared/schema/task-view.schema.js";
import type { TaskView } from "../../shared/schema/task-view.schema.js";
import { createdStep, editedStep, movedStep, startedStep } from "./lib/agent-edits.js";
import { attachedStep, checkedStep, markedStep } from "./lib/progress-edits.js";

export const CreateTaskCommand = command("create-task")
	.public()
	.input(CreateTaskAskSchema)
	.output(CreatedSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tasks, clock }) => {
		const now = clock.now();
		const changed = await tasks.changeTask((board) => createdStep(board, ask, now), {
			find: (board) => sameOpenTitleOf(board, ask.title),
			named: ask.title,
		});

		if (!changed.ok) {
			return refuse(changed.refusal);
		}

		return {
			task: viewOf(changed.board, changed.task, now),
			isExisting: !changed.isChanged,
		};
	});

export const EditTaskCommand = command("edit-task")
	.public()
	.input(EditTaskAskSchema)
	.output(TaskViewSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tasks, clock }) =>
		viewAfter(tasks, clock.now(), { ref: ask.task, next: (board, now) => editedStep(board, ask, now) }),
	);

export const StartTaskCommand = command("start-task")
	.public()
	.input(StartTaskAskSchema)
	.output(TaskViewSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tasks, clock }) =>
		viewAfter(tasks, clock.now(), { ref: ask.task, next: (board, now) => startedStep(board, ask, now) }),
	);

export const MarkStepCommand = command("mark-step")
	.public()
	.input(MarkStepAskSchema)
	.output(TaskViewSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tasks, clock }) =>
		viewAfter(tasks, clock.now(), { ref: ask.task, next: (board, now) => markedStep(board, ask, now) }),
	);

export const CheckCriterionCommand = command("check-criterion")
	.public()
	.input(CheckCriterionAskSchema)
	.output(TaskViewSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tasks, clock }) =>
		viewAfter(tasks, clock.now(), { ref: ask.task, next: (board, now) => checkedStep(board, ask, now) }),
	);

export const AttachToTaskCommand = command("attach-to-task")
	.public()
	.input(AttachToTaskAskSchema)
	.output(TaskViewSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tasks, clock }) =>
		viewAfter(tasks, clock.now(), { ref: ask.task, next: (board, now) => attachedStep(board, ask, now) }),
	);

export const MoveTaskCommand = command("move-task")
	.public()
	.input(MoveTaskAskSchema)
	.output(TaskViewSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tasks, clock }) =>
		viewAfter(tasks, clock.now(), { ref: ask.task, next: (board, now) => movedStep(board, ask, now) }),
	);

async function viewAfter(
	tasks: TasksGateway,
	now: number,
	change: { readonly ref: string; readonly next: (board: Board, now: number) => BoardStep },
): Promise<TaskView> {
	const changed = await tasks.changeTask((board) => change.next(board, now), finderOfRef(change.ref));
	return changed.ok ? viewOf(changed.board, changed.task, now) : refuse(changed.refusal);
}
