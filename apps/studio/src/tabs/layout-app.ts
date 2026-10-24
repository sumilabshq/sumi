import { app } from "@widgetarium/core/requests";
import type { Platform, StartedApp } from "@widgetarium/core/requests";
import { LayoutModule } from "@widgetarium/layout/module";

export interface LayoutAppAsk {
	readonly platform: Platform;
	readonly workspaceId: string;
}

export function startLayoutApp({ platform, workspaceId }: LayoutAppAsk): StartedApp {
	return app().modules(LayoutModule).start({ platform, scope: { workspaceId } });
}
