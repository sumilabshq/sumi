import { requestUrl } from "obsidian";
import type { ObsidianDesignHeld } from "@widgetarium/canvas";
import type WidgetariumPlugin from "../main.js";

export function designHeldOf(plugin: WidgetariumPlugin, place: ObsidianDesignHeld["place"]): ObsidianDesignHeld {
	const { app, registry, host } = plugin;
	return { obsidian: app, registry, host, jobs: plugin.assistant.jobs, place, fetchUrl: requestUrl };
}
