import { Platform } from "obsidian";
import { electronBrowserParts, webBrowserParts } from "@widgetarium/browser/gateways";
import type { BrowserParts } from "@widgetarium/browser/gateways";
import type { WidgetariumPlugin } from "../main.js";
import { answerPendingAsks, openBrowserDesk } from "./browser-desk-responder.js";

const DESK_POLL_MS = 500;
const REMOTE_MODULE = "@electron/remote";

export function startObsidianBrowser(plugin: WidgetariumPlugin): BrowserParts {
	const loadModule: unknown = Reflect.get(window, "require");

	if (!Platform.isDesktopApp || typeof loadModule !== "function") {
		return webBrowserParts();
	}

	try {
		const parts = electronBrowserParts({
			remote: Reflect.apply(loadModule, window, [REMOTE_MODULE]),
			machineStorage: window.localStorage,
		});
		answerAgentDesk(plugin, parts);
		return parts;
	} catch (failure) {
		console.error("[widgetarium] the browser could not be locked down and stays off", failure);
		return webBrowserParts();
	}
}

function answerAgentDesk(plugin: WidgetariumPlugin, parts: BrowserParts): void {
	const desk = openedDesk(plugin, parts);

	if (desk === null) {
		return;
	}

	plugin.registerInterval(
		window.setInterval(() => {
			answerPendingAsks(desk).catch((failure: unknown) => {
				console.error("[widgetarium] the browser desk failed to answer the agent", failure);
			});
		}, DESK_POLL_MS),
	);
}

function openedDesk(plugin: WidgetariumPlugin, parts: BrowserParts): ReturnType<typeof openBrowserDesk> {
	try {
		return openBrowserDesk(plugin.app.vault.adapter, parts);
	} catch (failure) {
		console.error("[widgetarium] the browser desk is not private, so Ink cannot reach the browser", failure);
		return null;
	}
}
