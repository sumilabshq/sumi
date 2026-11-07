import { refuse } from "@widgetarium/data-framework";
import { query, subscriber } from "#module";
import { TasksChangedEvent } from "../../gateways/tasks/tasks.events.js";
import { boardAnswerOf, pageOf, searchOf } from "../../shared/lib/board-views.js";
import { cardOf, openOwnedOf, openTaskOf, turnTrailerOf, viewOf } from "../../shared/lib/task-cards.js";
import { taskOfRef } from "../../shared/lib/task-refs.js";
import { BoardAskSchema, ChatAskSchema, SearchAskSchema, TaskAskSchema, TasksAskSchema } from "../../shared/schema/task-asks.schema.js";
import { BoardAnswerSchema, ChatTaskLineSchema, SearchHitsSchema, TaskPageSchema, TaskViewSchema, TurnTrailerSchema } from "../../shared/schema/task-view.schema.js";

export const BoardQuery = query("board")
	.public()
	.input(BoardAskSchema)
	.output(BoardAnswerSchema)
	.handle(async (ask, { tasks, clock }) => boardAnswerOf((await tasks.board()).board, ask, clock.now()));

export const TasksQuery = query("tasks")
	.public()
	.input(TasksAskSchema)
	.output(TaskPageSchema)
	.handle(async (ask, { tasks, clock }) => pageOf((await tasks.board()).board, ask, clock.now()));

export const TaskQuery = query("task")
	.public()
	.input(TaskAskSchema)
	.output(TaskViewSchema)
	.handle(async ({ task: ref }, { tasks, clock }) => {
		const { board } = await tasks.board();
		const task = taskOfRef(board, ref);

		if (typeof task === "string") {
			return refuse(task);
		}

		return viewOf(board, task, clock.now());
	});

export const SearchTasksQuery = query("search-tasks")
	.public()
	.input(SearchAskSchema)
	.output(SearchHitsSchema)
	.handle(async (ask, { tasks, clock }) => [...searchOf((await tasks.board()).board, ask, clock.now())]);

export const ChatTaskLineQuery = query("chat-task-line")
	.public()
	.input(ChatAskSchema)
	.output(ChatTaskLineSchema)
	.handle(async ({ chat }, { tasks, clock }) => {
		const { board } = await tasks.board();
		const task = openTaskOf(board, chat);
		return {
			card: task === null ? null : cardOf(board, task, clock.now()),
			alsoOpen: Math.max(0, openOwnedOf(board, chat).length - (task === null ? 0 : 1)),
		};
	});

export const TaskTrailerQuery = query("task-trailer")
	.public()
	.input(ChatAskSchema)
	.output(TurnTrailerSchema)
	.handle(async ({ chat }, { tasks }) => turnTrailerOf((await tasks.board()).board, chat));

export const RereadTasksSubscriber = subscriber(TasksChangedEvent).handle((_input, { invalidate }) => {
	invalidate(BoardQuery);
	invalidate(TasksQuery);
	invalidate(TaskQuery);
	invalidate(SearchTasksQuery);
	invalidate(ChatTaskLineQuery);
	invalidate(TaskTrailerQuery);
});
