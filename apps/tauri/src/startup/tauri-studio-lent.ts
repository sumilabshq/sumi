import { Channel, invoke } from "@tauri-apps/api/core";
import type { StoreClient } from "@widgetarium/behaviors/tauri-store";
import type { TauriStudioLent } from "@widgetarium/studio";
import { CORE_CHANGED_EVENT } from "../core-link/core-wire.js";
import { listenOnWindow } from "../core-link/ipc-transport.js";

export function tauriStudioLent(store: StoreClient): TauriStudioLent {
	return {
		store,
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
