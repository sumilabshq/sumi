import { AuthenticatedGuard, Anywhere, module } from "@widgetarium/data-framework";
import { tasks } from "@widgetarium/tasks/contract";

export const taskWork = module("task-work")
	.on(Anywhere)
	.imports(tasks)
	.guard(AuthenticatedGuard)
	.provide(() => ({}));
