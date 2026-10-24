import { Notice } from "obsidian";
import type { Plugin } from "obsidian";
import type { HostApp, StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import { failureMessage } from "@widgetarium/core/engine/failure-message.js";
import { obsidianStudioHost } from "./legacy/studio-host-obsidian.js";
import { STUDIO_VIEW_TYPE } from "./legacy/studio-view.js";
import { OpenAppModal } from "./open-app-modal.js";
import { openPluginSettings } from "./settings-tab.js";

const NOT_DONE = "Widgetarium: {why}";
const CREATE_APP = "create new app";
const OPEN_APP = "open app";

export function addCommands(plugin: Plugin): void {
	plugin.addCommand({
		id: "settings",
		name: "Settings",
		callback: () => openPluginSettings(plugin.app, plugin.manifest.id),
	});
	plugin.addCommand({
		id: "create-app",
		name: "Create new app",
		callback: () => void reported(CREATE_APP, () => studioHostInActiveLeaf(plugin).createApp()),
	});
	plugin.addCommand({
		id: "open-app",
		name: "Open app",
		callback: () => void reported(OPEN_APP, () => pickAppToOpen(plugin)),
	});
}

async function pickAppToOpen(plugin: Plugin): Promise<void> {
	const studioHost = studioHostInActiveLeaf(plugin);
	const apps = await studioHost.apps();
	const open = (picked: HostApp): void => void reported(OPEN_APP, () => studioHost.openApp(picked.id));
	new OpenAppModal(plugin.app, apps, open).open();
}

function studioHostInActiveLeaf(plugin: Plugin): StudioHostPort {
	const leaf = plugin.app.workspace.getLeaf(false);
	return obsidianStudioHost({ app: plugin.app, leaf, frame: leaf.view.containerEl, viewType: STUDIO_VIEW_TYPE });
}

async function reported(action: string, run: () => Promise<void>): Promise<void> {
	try {
		await run();
	} catch (failure) {
		console.error(`[widgetarium] ${action} → failed`, failure);
		new Notice(NOT_DONE.replace("{why}", failureMessage(failure)));
	}
}
