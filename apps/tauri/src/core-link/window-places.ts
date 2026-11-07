import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { runtime } from "@widgetarium/data-framework";
import type { Runtime } from "@widgetarium/data-framework";
import { CloseWindowCommand, OpenWindowCommand, OpenWindowsQuery, PlacesModule } from "@widgetarium/places";
import { ipcTransport } from "./ipc-transport.js";

export interface WindowPlaces {
	readonly places: Runtime;
	leave(): Promise<void>;
}

const LEAVE_WAIT_MS = 1000;
const NOT_JOINED = "[places] window {window}: none → open refused ({reason})";
const NOT_LEFT = "[places] window {window}: open → close refused ({reason})";

export function joinPlaces(workspace: string): WindowPlaces {
	const places = runtime()
		.imports(PlacesModule({ over: ipcTransport(workspace) }))
		.start();
	const window = getCurrentWebviewWindow().label;
	const membership = { isLeaving: false };
	void join(places, window);
	places.routes.watch(OpenWindowsQuery, undefined, () => {
		if (!membership.isLeaving) {
			void rejoinIfMissing(places, window);
		}
	});
	return {
		places,
		leave: () => {
			membership.isLeaving = true;
			return Promise.race([leave(places, window), new Promise<void>((waited) => setTimeout(waited, LEAVE_WAIT_MS))]);
		},
	};
}

async function join(places: Runtime, window: string): Promise<void> {
	const answered = await places.send(OpenWindowCommand, { window });

	if (!answered.ok) {
		console.warn(NOT_JOINED.replace("{window}", window).replace("{reason}", answered.reason));
	}
}

async function rejoinIfMissing(places: Runtime, window: string): Promise<void> {
	const open = await places.send(OpenWindowsQuery);

	if (open.ok && !open.output.windows.some((listed) => listed.label === window)) {
		await join(places, window);
	}
}

async function leave(places: Runtime, window: string): Promise<void> {
	const answered = await places.send(CloseWindowCommand, { window });

	if (!answered.ok) {
		console.warn(NOT_LEFT.replace("{window}", window).replace("{reason}", answered.reason));
	}
}
