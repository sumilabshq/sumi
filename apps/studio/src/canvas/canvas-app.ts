import { CanvasModule } from "@widgetarium/canvas/module";
import type { CanvasHosts as CanvasConfig } from "@widgetarium/canvas/module";
import { app } from "@widgetarium/data-framework";
import type { StartedApp } from "@widgetarium/data-framework";
import type { CanvasHosts } from "./canvas-hosts.js";

export function startCanvasApp(hosts: CanvasHosts, appName: string): StartedApp {
	return app()
		.modules(CanvasModule(canvasConfigOf(hosts)))
		.start({
			platform: "browser",
			scope: { workspaceId: appName },
		});
}

function canvasConfigOf(hosts: CanvasHosts): CanvasConfig {
	if ("project" in hosts) {
		return {
			kind: "project",
			project: hosts.project,
		};
	}

	return {
		kind: "vault",
		...hosts,
	};
}
