import { AssistantModule } from "@widgetarium/assistant/module";
import { app } from "@widgetarium/data-framework";
import type { Platform, PlatformModule, RemoteTransport, StartedApp } from "@widgetarium/data-framework";
import { MascotModule } from "@widgetarium/mascot/module";
import { TasksModule } from "@widgetarium/tasks";

export type AssistantHostObjects =
	typeof AssistantModule extends PlatformModule<infer _Parts, infer _Runs, infer Lent> ? Lent : never;

export interface ChatAppAsk {
	readonly platform: Platform;
	readonly workspaceId: string;
	readonly host: AssistantHostObjects;
	readonly tasks: RemoteTransport;
}

export function chatAppOf({ platform, workspaceId, host, tasks }: ChatAppAsk): StartedApp {
	return app().modules(MascotModule, AssistantModule).imports(TasksModule.over(tasks)).start({
		platform,
		scope: {
			workspaceId,
		},
		host,
	});
}
