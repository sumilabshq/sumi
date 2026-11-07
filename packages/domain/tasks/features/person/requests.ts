import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command } from "#module";
import { cardOf } from "../../shared/lib/task-cards.js";
import { finderOfRef } from "../../shared/lib/task-refs.js";
import { ContinueAskSchema, SendBackAskSchema, TaskAskSchema, UndeliveredAskSchema } from "../../shared/schema/task-asks.schema.js";
import { ContinuedSchema, TaskCardSchema } from "../../shared/schema/task-view.schema.js";
import { acceptedStep, continueMessageOf, continuedStep, keptStep, sentBackMessageOf, sentBackStep, undeliveredStep } from "./lib/person-edits.js";

export const AcceptTaskCommand = command("accept-task")
	.public()
	.input(TaskAskSchema)
	.output(TaskCardSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ task: ref }, { tasks, clock }) => {
		const now = clock.now();
		const changed = await tasks.changeTask((board) => acceptedStep(board, ref, now), finderOfRef(ref));
		return changed.ok ? cardOf(changed.board, changed.task, now) : refuse(changed.refusal);
	});

export const KeepTaskCommand = command("keep-task")
	.public()
	.input(TaskAskSchema)
	.output(TaskCardSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ task: ref }, { tasks, clock }) => {
		const now = clock.now();
		const changed = await tasks.changeTask((board) => keptStep(board, ref, now), finderOfRef(ref));
		return changed.ok ? cardOf(changed.board, changed.task, now) : refuse(changed.refusal);
	});

export const SendBackTaskCommand = command("send-back-task")
	.public()
	.input(SendBackAskSchema)
	.output(ContinuedSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tasks, clock }) => {
		const changed = await tasks.changeTask((board) => sentBackStep(board, ask, clock.now()), finderOfRef(ask.task));

		if (!changed.ok) {
			return refuse(changed.refusal);
		}

		return {
			chat: changed.task.owner,
			message: sentBackMessageOf(changed.task, ask.note),
		};
	});

export const ContinueTaskCommand = command("continue-task")
	.public()
	.input(ContinueAskSchema)
	.output(ContinuedSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tasks, clock }) => {
		const changed = await tasks.changeTask((board) => continuedStep(board, ask, clock.now()), finderOfRef(ask.task));

		if (!changed.ok) {
			return refuse(changed.refusal);
		}

		return {
			chat: changed.task.owner,
			message: continueMessageOf(changed.task),
		};
	});

export const UndeliveredTaskCommand = command("undelivered-task")
	.public()
	.input(UndeliveredAskSchema)
	.output(TaskCardSchema)
	.idempotencyKey(Repeatable)
	.handle(async (ask, { tasks, clock }) => {
		const now = clock.now();
		const changed = await tasks.changeTask((board) => undeliveredStep(board, ask, now), finderOfRef(ask.task));
		return changed.ok ? cardOf(changed.board, changed.task, now) : refuse(changed.refusal);
	});
