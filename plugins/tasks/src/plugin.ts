import { apps } from "@sumi/apps-plugin";
import { chat } from "@sumi/chat-plugin";
import { mcp } from "@sumi/mcp-plugin";
import { backend } from "@sumi/sumi-host-plugin";
import { taskWork } from "@sumi/task-work/implementation";
import { plugin } from "@widgetarium/plugin-framework";
import { tasks as tasksContract } from "@widgetarium/tasks/contract";
import { tasks as tasksModule } from "@widgetarium/tasks/implementation";
import { LiveTaskRows } from "./features/chat-tasks/ui/live-task-rows/live-task-rows.js";
import { LiveTasksCount } from "./features/chat-tasks/ui/live-tasks-count/live-tasks-count.js";

export const tasks = plugin("tasks")
	.require(backend, apps, chat, mcp)
	.apply((app) => {
		app.use(backend).moduleOf(({ file }) => tasksModule({ file }), tasksContract);
		app.use(apps).app({ id: "tasks", title: "Tasks", art: "tasks" });
		app.use(chat).pageImport(({ core }) => tasksContract({ over: core }));
		app.use(chat).slots.liveTail.add(LiveTasksCount);
		app.use(chat).slots.liveRows.add(LiveTaskRows);
		app.use(mcp).server({ name: "tasks", modules: [taskWork] });
	});
