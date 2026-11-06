import { PublicGuard, Server, module } from "@widgetarium/core/requests";
import { tasksPartsOn } from "./gateways/tasks-parts/tasks-parts.gateway.js";
import { TASKS_HOST_NEEDS } from "./shared/host/tasks-host.js";
import {
	AttachToTaskCommand,
	CheckCriterionCommand,
	CreateTaskCommand,
	EditTaskCommand,
	MarkStepCommand,
	MoveTaskCommand,
	StartTaskCommand,
} from "./features/agent-work/requests.js";
import {
	BoardQuery,
	ChatTaskLineQuery,
	RereadTasksSubscriber,
	SearchTasksQuery,
	TaskQuery,
	TaskTrailerQuery,
	TasksQuery,
} from "./features/board/requests.js";
import {
	AcceptTaskCommand,
	ContinueTaskCommand,
	KeepTaskCommand,
	SendBackTaskCommand,
	UndeliveredTaskCommand,
} from "./features/person/requests.js";
import {
	ReconcileTasksCommand,
	ReleaseChatTasksCommand,
	SettleTurnCommand,
	SweepStaleTasksCommand,
} from "./features/supervision/requests.js";

export type { BoardFile } from "./shared/host/tasks-host.js";

export const TasksModule = module("tasks")
	.on(Server)
	.needs(TASKS_HOST_NEEDS)
	.guard(PublicGuard)
	.subscribers(RereadTasksSubscriber)
	.public(BoardQuery, TasksQuery, TaskQuery, SearchTasksQuery, ChatTaskLineQuery, TaskTrailerQuery)
	.public(
		CreateTaskCommand,
		EditTaskCommand,
		StartTaskCommand,
		MarkStepCommand,
		CheckCriterionCommand,
		AttachToTaskCommand,
		MoveTaskCommand,
	)
	.public(AcceptTaskCommand, SendBackTaskCommand, ContinueTaskCommand, KeepTaskCommand, UndeliveredTaskCommand)
	.public(SettleTurnCommand, ReleaseChatTasksCommand, ReconcileTasksCommand, SweepStaleTasksCommand)
	.provide((facts) => tasksPartsOn(facts));
