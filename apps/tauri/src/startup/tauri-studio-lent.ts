import { Channel, invoke } from "@tauri-apps/api/core";
import { getAllWindows, getCurrentWindow } from "@tauri-apps/api/window";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { TauriStudioLent } from "@widgetarium/studio";
import { CORE_CHANGED_EVENT } from "../core-link/core-wire.js";
import { listenOnWindow } from "../core-link/ipc-transport.js";

export function tauriStudioLent(store: StoreClient): TauriStudioLent {
	return {
		store,
		windows: {
			openLabels: async () => (await getAllWindows()).map((window) => window.label),
			onOwnCloseAsked: (listener) => void getCurrentWindow().onCloseRequested(listener),
		},
		coreChanges: {
			onCoreChanged: (listener) => listenOnWindow(CORE_CHANGED_EVENT, () => listener()),
		},
		ipc: {
			invoke: (command, args) => invoke(command, args),
			channel: (onMessage) => {
				const channel = new Channel<unknown>();
				channel.onmessage = onMessage;
				return channel;
			},
		},
	};
}
