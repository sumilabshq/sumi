import { TasksModule } from "@widgetarium/tasks";
import { TasksModule as RunnableTasksModule } from "@widgetarium/tasks/module";
import type { BoardFile } from "@widgetarium/tasks/module";
import { app, localTransport } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { server } from "@widgetarium/core/requests/server";

const FRAME_WORKSPACE = "tasks";

export function startTasksApp(file: BoardFile): StartedApp {
	const local = localTransport();
	server()
		.modules(RunnableTasksModule)
		.listen(local)
		.start({
			env: {},
			scope: {
				workspaceId: FRAME_WORKSPACE,
			},
			host: {
				file,
			},
		});
	return app().imports(TasksModule.over(local)).start({
		platform: "browser",
	});
}
