import { PublicGuard, Server, module } from "@widgetarium/data-framework";
import { tasksPartsOn } from "./gateways/tasks-parts/tasks-parts.gateway.js";
import type { TasksConfig } from "./shared/host/tasks.host.js";
import { handled } from "./generated/handled.js";

export type { BoardFile, TasksConfig } from "./shared/host/tasks.host.js";

export const TasksModule = module("tasks")
	.on(Server)
	.config<TasksConfig>()
	.guard(PublicGuard)
	.provide((facts) => tasksPartsOn(facts))
	.handles(...handled);
