import { BrowserTabsQuery } from "@widgetarium/browser";
import type { StartedApp } from "@widgetarium/core/requests";
import { startBrowserApp } from "@widgetarium/studio";
import type { WidgetariumPlugin } from "../main.js";
import { answerPendingAsks, openBrowserDesk } from "./browser-desk-responder.js";

const DESK_POLL_MS = 500;

export function startObsidianBrowser(plugin: WidgetariumPlugin): StartedApp {
	const browserApp = startBrowserApp({
		platform: "browser",
		workspaceId: plugin.app.vault.getName(),
	});
	void answerAgentDesk(plugin, browserApp);
	return browserApp;
}

async function answerAgentDesk(plugin: WidgetariumPlugin, browserApp: StartedApp): Promise<void> {
	const tabs = await browserApp.send(BrowserTabsQuery, { heldTabId: null });

	if (!tabs.ok || !tabs.output.isAvailable) {
		console.info("[widgetarium] the browser desk stays shut: this host draws no pages");
		return;
	}

	const desk = openedDesk(plugin, browserApp);

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

function openedDesk(plugin: WidgetariumPlugin, browserApp: StartedApp): ReturnType<typeof openBrowserDesk> {
	try {
		return openBrowserDesk(plugin.app.vault.adapter, browserApp);
	} catch (failure) {
		console.error("[widgetarium] the browser desk is not private, so Sumi cannot reach the browser", failure);
		return null;
	}
}
