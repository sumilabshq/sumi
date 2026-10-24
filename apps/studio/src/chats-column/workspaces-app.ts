import { app } from "@widgetarium/core/requests";
import type { Platform, StartedApp } from "@widgetarium/core/requests";
import { WorkspacesModule } from "@widgetarium/workspaces/module";

export interface WorkspacesAppAsk {
	readonly platform: Platform;
	readonly workspaceId: string;
}

export function startWorkspacesApp({ platform, workspaceId }: WorkspacesAppAsk): StartedApp {
	return app().modules(WorkspacesModule).start({ platform, scope: { workspaceId } });
}
