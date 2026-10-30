import { invoke } from "@tauri-apps/api/core";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { z } from "zod";
import { app, localTransport } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { server } from "@widgetarium/core/requests/server";
import { CloseWindowCommand, KeepLiveWindowsCommand, PlacesModule as PlacesContract } from "@widgetarium/places";
import { PlacesModule } from "@widgetarium/places/module";
import { serveCore } from "./core-calls.js";
import { CORE_LIVE_WINDOWS, CORE_WINDOW_CLOSED_EVENT, LiveWindowsSchema } from "./core-wire.js";

const NOT_KEPT = "[studio-core] workspace {workspace}: the open windows were not checked ({reason})";
const NOT_CLOSED = "[studio-core] workspace {workspace}: window {window} closed but stays listed ({reason})";

export function startCore(): void {
	const served = new Map<string, StartedApp>();
	serveCore((workspace, listener) => {
		const own = localTransport();
		server()
			.modules(PlacesModule)
			.listen(listener)
			.listen(own)
			.start({
				env: { PLACES_STORE: "tauri" },
				scope: { workspaceId: workspace },
			});
		const places = app().imports(PlacesContract.over(own)).start();
		served.set(workspace, places);
		console.info(`[studio-core] workspace ${workspace}: none → serving places`);
		void keepLiveWindows(places, workspace);
	});
	void getCurrentWebviewWindow().listen(CORE_WINDOW_CLOSED_EVENT, (event) => {
		const window = z.string().safeParse(event.payload);

		if (window.success) {
			closeEverywhere(served, window.data);
		}
	});
}

function closeEverywhere(served: ReadonlyMap<string, StartedApp>, window: string): void {
	for (const [workspace, places] of served) {
		void places.send(CloseWindowCommand, { window }).then((answered) => {
			if (!answered.ok) {
				console.warn(
					NOT_CLOSED.replace("{workspace}", workspace).replace("{window}", window).replace("{reason}", answered.reason),
				);
			}
		});
	}
}

async function keepLiveWindows(places: StartedApp, workspace: string): Promise<void> {
	const live = LiveWindowsSchema.parse(await invoke(CORE_LIVE_WINDOWS));
	const answered = await places.send(KeepLiveWindowsCommand, { windows: live });

	if (!answered.ok) {
		console.warn(NOT_KEPT.replace("{workspace}", workspace).replace("{reason}", answered.reason));
	}
}
