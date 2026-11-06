import { cursorPosition, getCurrentWindow } from "@tauri-apps/api/window";
import { browserStudioHost } from "@widgetarium/studio";
import type { ChromeInsets, StudioHostPort } from "@widgetarium/studio";
import type { CursorPoint } from "@widgetarium/core/engine/studio-host.js";
import { NO_INSETS } from "@widgetarium/core/engine/studio-host.js";
import type { WidgetariumProject } from "@widgetarium/core/app/widgetarium-project.js";
import type { WorkspaceApps } from "./workspace/tauri-workspace-apps.js";

const TRAFFIC_LIGHTS_RIGHT_EDGE_PX = 76;
const TRAFFIC_LIGHTS_BOTTOM_EDGE_PX = 37;

export const BESIDE_TRAFFIC_LIGHTS: ChromeInsets = {
	left: TRAFFIC_LIGHTS_RIGHT_EDGE_PX,
	right: 0,
	top: TRAFFIC_LIGHTS_BOTTOM_EDGE_PX,
};

export function tauriStudioHost(project: WidgetariumProject, workspaceApps: WorkspaceApps): StudioHostPort {
	const held = { insets: BESIDE_TRAFFIC_LIGHTS };
	return {
		...browserStudioHost(project.app, project.routes),
		...workspaceApps,
		insets: () => held.insets,
		cursorInWindow,
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

async function cursorInWindow(): Promise<CursorPoint> {
	const studioWindow = getCurrentWindow();
	const [cursor, inner, scale] = await Promise.all([
		cursorPosition(),
		studioWindow.innerPosition(),
		studioWindow.scaleFactor(),
	]);
	return {
		x: (cursor.x - inner.x) / scale,
		y: (cursor.y - inner.y) / scale,
	};
}
