import { Channel, invoke } from "@tauri-apps/api/core";
import { tauriBrowserParts, webBrowserParts } from "@widgetarium/browser/gateways";
import type { BrowserParts, TauriBrowserHold } from "@widgetarium/browser/gateways";

const browserIpc: TauriBrowserHold["ipc"] = {
	invoke: (command, args) => invoke(command, args),
	channel: (onMessage) => {
		const channel = new Channel<unknown>();
		channel.onmessage = onMessage;
		return channel;
	},
};

export function startTauriBrowser(profileGateways?: TauriBrowserHold["profileGateways"]): BrowserParts {
	try {
		return tauriBrowserParts({
			ipc: browserIpc,
			machineStorage: window.localStorage,
			...(profileGateways === undefined ? {} : { profileGateways }),
		});
	} catch (failure) {
		console.error("[widgetarium] the browser could not start and stays off", failure);
		return webBrowserParts();
	}
}
