import type { Actor, Board, Task } from "../schema/task.schema.js";
import { refuseCriterionState, refuseMove } from "./gates.js";
import { idOf, taskOfNumber } from "./task-refs.js";

const NUMBER_WENT_DOWN = "The board's next number went from {was} to {now}; it only grows.";
const TASK_LEFT = "{id} left the board; a task is cancelled, never removed.";
const SHELL_FIELD_CHANGED = "{id}: {field} belongs to Sumi's chats and cannot be changed by an app.";
const NEW_TASK_NUMBER = "{id} is new but its number is below the board's next number {next}.";
const CRITERION_LEFT = "{id}: criterion {criterion} left the task; it is dropped with a reason, never removed.";

const SHELL_FIELDS = ["chats", "workplaces", "owner"] as const;

const PERSON: Actor = {
	kind: "person",
};

export function refuseBoardReplace(held: Board, next: Board): string | null {
	if (next.nextNumber < held.nextNumber) {
		return NUMBER_WENT_DOWN.replace("{was}", String(held.nextNumber)).replace("{now}", String(next.nextNumber));
	}

	const left = held.tasks.find((task) => taskOfNumber(next, task.number) === null);

	if (left !== undefined) {
		return TASK_LEFT.replace("{id}", idOf(left.number));
	}

	for (const task of next.tasks) {
		const was = taskOfNumber(held, task.number);
		const refusal = was === null ? refuseNewTask(held, task) : refuseTaskChange(held, was, task);

		if (refusal !== null) {
			return refusal;
		}
	}

	return null;
}

function refuseNewTask(held: Board, task: Task): string | null {
	if (task.number < held.nextNumber) {
		return NEW_TASK_NUMBER.replace("{id}", idOf(task.number)).replace("{next}", String(held.nextNumber));
	}

	const blank: Pick<Task, (typeof SHELL_FIELDS)[number]> = {
		chats: [],
		workplaces: [],
		owner: null,
	};
	return refuseShellFields(blank, task);
}

function refuseTaskChange(held: Board, was: Task, task: Task): string | null {
	const shellRefusal = refuseShellFields(was, task);

	if (shellRefusal !== null) {
		return shellRefusal;
	}

	const moveRefusal = was.status === task.status ? null : refuseMove(held, was, { to: task.status, by: PERSON });
	return moveRefusal ?? refuseCriteriaChange(was, task);
}

function refuseShellFields(was: Pick<Task, (typeof SHELL_FIELDS)[number]>, task: Task): string | null {
	const changed = SHELL_FIELDS.find((field) => JSON.stringify(was[field]) !== JSON.stringify(task[field]));
	return changed === undefined
		? null
		: SHELL_FIELD_CHANGED.replace("{id}", idOf(task.number)).replace("{field}", changed);
}

function refuseCriteriaChange(was: Task, task: Task): string | null {
	for (const criterion of was.acceptance) {
		const now = task.acceptance.find((kept) => kept.id === criterion.id);

		if (now === undefined) {
			return CRITERION_LEFT.replace("{id}", idOf(task.number)).replace("{criterion}", criterion.id);
		}

		const refusal = now.state === criterion.state ? null : refuseCriterionState(now, now.id);

		if (refusal !== null) {
			return refusal;
		}
	}

	return null;
}
