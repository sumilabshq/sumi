import { Repeatable, command, refuse } from "@widgetarium/framework";
import { ClockGateway } from "../../gateways/clock/clock.gateway.js";
import { TasksGateway } from "../../gateways/tasks/tasks.gateway.js";
import type { BoardStep } from "../../shared/lib/task-moves.js";
import type { Board } from "../../shared/schema/task.schema.js";
import { ReconcileAskSchema, ReleaseChatAskSchema, SettleTurnAskSchema } from "../../shared/schema/task-asks.schema.js";
import { ChangedCountSchema, TurnFollowUpSchema } from "../../shared/schema/task-view.schema.js";
import type { ChangedCount } from "../../shared/schema/task-view.schema.js";
import { followUpOf, reconciledStep, releasedStep, settledStep, sweptStep } from "./lib/supervision-edits.js";

export const SettleTurnCommand = command("settle-turn")
	.input(SettleTurnAskSchema)
	.output(TurnFollowUpSchema)
	.idempotencyKey((input) => `${input.chat}:${input.turn}`)
	.inject({ tasks: TasksGateway, clock: ClockGateway })
	.handle(async (ask, { tasks, clock }) => {
		const changed = await tasks.changeBoard((board) => settledStep(board, ask, clock.now()));

		if (!changed.ok) {
			return refuse(changed.refusal);
		}

		return followUpOf(changed.board, ask);
	});

export const ReleaseChatTasksCommand = command("release-chat-tasks")
	.input(ReleaseChatAskSchema)
	.output(ChangedCountSchema)
	.idempotencyKey(Repeatable)
	.inject({ tasks: TasksGateway, clock: ClockGateway })
	.handle(async (ask, { tasks, clock }) => countAfter(tasks, (board) => releasedStep(board, ask, clock.now())));

export const ReconcileTasksCommand = command("reconcile-tasks")
	.input(ReconcileAskSchema)
	.output(ChangedCountSchema)
	.idempotencyKey(Repeatable)
	.inject({ tasks: TasksGateway, clock: ClockGateway })
	.handle(async (ask, { tasks, clock }) => countAfter(tasks, (board) => reconciledStep(board, ask, clock.now())));

export const SweepStaleTasksCommand = command("sweep-stale-tasks")
	.output(ChangedCountSchema)
	.idempotencyKey(Repeatable)
	.inject({ tasks: TasksGateway, clock: ClockGateway })
	.handle(async (_input, { tasks, clock }) => countAfter(tasks, (board) => sweptStep(board, clock.now())));

async function countAfter(tasks: TasksGateway, next: (board: Board) => BoardStep): Promise<ChangedCount> {
	const changed = await tasks.changeBoard(next);
	return changed.ok ? { changed: changed.changedTasks.length } : refuse(changed.refusal);
}
