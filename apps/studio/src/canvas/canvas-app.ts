import { CanvasModule } from "@widgetarium/canvas/module";
import { app } from "@widgetarium/data-framework";
import type { StartedApp } from "@widgetarium/data-framework";
import type { CanvasHosts } from "./canvas-hosts.js";

export function startCanvasApp(hosts: CanvasHosts, appName: string): StartedApp {
	return app()
		.modules(CanvasModule)
		.start({
			platform: "browser",
			scope: { workspaceId: appName },
			host: hosts,
		});
}
