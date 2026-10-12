import { Notice } from "obsidian";
import type { TAbstractFile } from "obsidian";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { createAppProjects } from "./legacy/app-projects.js";
import type { AppProjects } from "./legacy/app-projects.js";
import { registerStudioView } from "./legacy/studio-leaves.js";
import { followAppFolderRename } from "./legacy/studio-renames.js";
import type { WidgetariumPlugin } from "./main.js";

const NOTES_NOT_RENAMED = "Widgetarium: the notes naming {was} were not renamed to {path} — the console says why";

export function registerStudio(plugin: WidgetariumPlugin, assistant: AssistantPort): void {
	const projects = createAppProjects(plugin.app.vault.adapter);
	plugin.register(() => projects.close());
	reportVaultChangesTo(plugin, projects);
	registerStudioView(plugin, projects, assistant);
}

function reportVaultChangesTo(plugin: WidgetariumPlugin, projects: AppProjects): void {
	const { vault } = plugin.app;
	const changed = (file: TAbstractFile): void => projects.changed(file.path);
	plugin.registerEvent(vault.on("modify", changed));
	plugin.registerEvent(vault.on("create", changed));
	plugin.registerEvent(vault.on("delete", changed));
	plugin.registerEvent(
		vault.on("rename", (file: TAbstractFile, was: string) => {
			projects.changed(was);
			changed(file);
			followAppFolderRename(plugin.app, file, was).catch((failure: unknown) => {
				console.error(`[widgetarium] notes naming ${was} → not renamed to ${file.path}`, failure);
				new Notice(NOTES_NOT_RENAMED.replace("{was}", was).replace("{path}", file.path));
			});
		}),
	);
}
