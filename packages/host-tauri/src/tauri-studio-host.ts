import { getCurrentWindow } from "@tauri-apps/api/window";
import { browserStudioHost } from "@widgetarium/studio";
import type { ChromeInsets, StudioHostPort } from "@widgetarium/studio";
import { NO_INSETS } from "@widgetarium/core/engine/studio-host.js";
import type { WidgetariumProject } from "@widgetarium/core/app/widgetarium-project.js";
import type { WorkspaceApps } from "./workspace/tauri-workspace-apps.js";

const TRAFFIC_LIGHTS_REACH_PX = 76;
const RAIL_BELOW_TRAFFIC_LIGHTS_PX = 35;

const BESIDE_TRAFFIC_LIGHTS: ChromeInsets = {
	left: TRAFFIC_LIGHTS_REACH_PX,
	right: 0,
	top: RAIL_BELOW_TRAFFIC_LIGHTS_PX,
};

export function tauriStudioHost(project: WidgetariumProject, workspaceApps: WorkspaceApps): StudioHostPort {
	const held = { insets: BESIDE_TRAFFIC_LIGHTS };
	return {
		...browserStudioHost(project.app, project.routes),
		...workspaceApps,
		insets: () => held.insets,
		onInsets: (changed) => {
			const reread = (): void => {
				void getCurrentWindow()
					.isFullscreen()
					.then((isFullscreen) => {
						held.insets = isFullscreen ? NO_INSETS : BESIDE_TRAFFIC_LIGHTS;
						changed();
					});
			};
			window.addEventListener("resize", reread);
			return () => window.removeEventListener("resize", reread);
		},
	};
}
