import { query, refuse, subscriber } from "@widgetarium/data-framework";
import { ClockGateway } from "../../gateways/clock/clock.gateway.js";
import { TasksChangedEvent } from "../../gateways/tasks/tasks.events.js";
import { TasksGateway } from "../../gateways/tasks/tasks.gateway.js";
import { boardAnswerOf, pageOf, searchOf } from "../../shared/lib/board-views.js";
import { cardOf, openOwnedOf, openTaskOf, turnTrailerOf, viewOf } from "../../shared/lib/task-cards.js";
import { taskOfRef } from "../../shared/lib/task-refs.js";
import {
	BoardAskSchema,
	ChatAskSchema,
	SearchAskSchema,
	TaskAskSchema,
	TasksAskSchema,
} from "../../shared/schema/task-asks.schema.js";
import {
	BoardAnswerSchema,
	ChatTaskLineSchema,
	SearchHitsSchema,
	TaskPageSchema,
	TaskViewSchema,
	TurnTrailerSchema,
} from "../../shared/schema/task-view.schema.js";

export const BoardQuery = query("board")
	.input(BoardAskSchema)
	.output(BoardAnswerSchema)
	.inject({ tasks: TasksGateway, clock: ClockGateway })
	.handle(async (ask, { tasks, clock }) => boardAnswerOf((await tasks.board()).board, ask, clock.now()));

export const TasksQuery = query("tasks")
	.input(TasksAskSchema)
	.output(TaskPageSchema)
	.inject({ tasks: TasksGateway, clock: ClockGateway })
	.handle(async (ask, { tasks, clock }) => pageOf((await tasks.board()).board, ask, clock.now()));

export const TaskQuery = query("task")
	.input(TaskAskSchema)
	.output(TaskViewSchema)
	.inject({ tasks: TasksGateway, clock: ClockGateway })
	.handle(async ({ task: ref }, { tasks, clock }) => {
		const { board } = await tasks.board();
		const task = taskOfRef(board, ref);

		if (typeof task === "string") {
			return refuse(task);
		}

		return viewOf(board, task, clock.now());
	});

export const SearchTasksQuery = query("search-tasks")
	.input(SearchAskSchema)
	.output(SearchHitsSchema)
	.inject({ tasks: TasksGateway, clock: ClockGateway })
	.handle(async (ask, { tasks, clock }) => [...searchOf((await tasks.board()).board, ask, clock.now())]);

export const ChatTaskLineQuery = query("chat-task-line")
	.input(ChatAskSchema)
	.output(ChatTaskLineSchema)
	.inject({ tasks: TasksGateway, clock: ClockGateway })
	.handle(async ({ chat }, { tasks, clock }) => {
		const { board } = await tasks.board();
		const task = openTaskOf(board, chat);
		return {
			card: task === null ? null : cardOf(board, task, clock.now()),
			alsoOpen: Math.max(0, openOwnedOf(board, chat).length - (task === null ? 0 : 1)),
		};
	});

export const TaskTrailerQuery = query("task-trailer")
	.input(ChatAskSchema)
	.output(TurnTrailerSchema)
	.inject({ tasks: TasksGateway })
	.handle(async ({ chat }, { tasks }) => turnTrailerOf((await tasks.board()).board, chat));

export const RereadTasksSubscriber = subscriber(TasksChangedEvent).handle((_input, { invalidate }) => {
	invalidate(BoardQuery);
	invalidate(TasksQuery);
	invalidate(TaskQuery);
	invalidate(SearchTasksQuery);
	invalidate(ChatTaskLineQuery);
	invalidate(TaskTrailerQuery);
});
