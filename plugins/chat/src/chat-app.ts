import { AssistantModule } from "@widgetarium/assistant/module";
import type { AssistantHosts } from "@widgetarium/assistant/module";
import { app } from "@widgetarium/data-framework";
import type { Platform, RemoteTransport, StartedApp } from "@widgetarium/data-framework";
import { MascotModule } from "@widgetarium/mascot/module";
import { TasksModule } from "@widgetarium/tasks";

export interface ChatAppAsk {
	readonly platform: Platform;
	readonly workspaceId: string;
	readonly host: AssistantHosts;
	readonly tasks: RemoteTransport;
}

export function chatAppOf({ platform, workspaceId, host, tasks }: ChatAppAsk): StartedApp {
	return app()
		.modules(MascotModule, AssistantModule(host))
		.imports(TasksModule.over(tasks))
		.start({
			platform,
			scope: {
				workspaceId,
			},
		});
}
