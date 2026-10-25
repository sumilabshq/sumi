import { AssistantModule } from "@widgetarium/assistant/module";
import { app } from "@widgetarium/core/requests";
import type { Platform, PlatformModule, StartedApp } from "@widgetarium/core/requests";
import { MascotModule } from "@widgetarium/mascot/module";

export type AssistantHostObjects =
	typeof AssistantModule extends PlatformModule<infer _Parts, infer _Runs, infer Lent> ? Lent : never;

export interface ChatAppAsk {
	readonly platform: Platform;
	readonly workspaceId: string;
	readonly host: AssistantHostObjects;
}

export function chatAppOf({ platform, workspaceId, host }: ChatAppAsk): StartedApp {
	return app().modules(MascotModule, AssistantModule).start({
		platform,
		scope: {
			workspaceId,
		},
		host,
	});
}
