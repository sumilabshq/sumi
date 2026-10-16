import type { App, WorkspaceLeaf } from "obsidian";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import { obsidianCanvasParts } from "@widgetarium/canvas/gateways";
import type { ObsidianDesign } from "@widgetarium/canvas/gateways";
import { webCanvasParts } from "@widgetarium/canvas/gateways";
import type { CanvasHost, CanvasParts, ReturnTo } from "@widgetarium/canvas/gateways";
import type WidgetariumPlugin from "../main.js";

export type DesignHeld = { readonly kind: "vault" } | { readonly kind: "project"; readonly project: StartedProject };

export const HELD_IN_VAULT: DesignHeld = { kind: "vault" };

const NO_NOTE_TO_RETURN_TO = "{app} has no page with a note to go back to.";

export function partsFor(plugin: WidgetariumPlugin, held: DesignHeld, canvasHost: CanvasHost): CanvasParts {
	if (held.kind === "project") return webCanvasParts(held.project, canvasHost);
	return obsidianCanvasParts(obsidianDesignOf(plugin), canvasHost);
}

export function returnToNoteIn(obsidian: App, leafOf: () => WorkspaceLeaf, app: string): ReturnTo {
	return { kind: "note", open: (note) => noteOpened(obsidian, leafOf(), note, app) };
}

async function noteOpened(obsidian: App, leaf: WorkspaceLeaf, note: string | null, app: string): Promise<void> {
	const file = note ? obsidian.vault.getFileByPath(note) : null;
	if (!file) throw new Error(NO_NOTE_TO_RETURN_TO.replace("{app}", app));
	await leaf.openFile(file, { active: true });
}

function obsidianDesignOf(plugin: WidgetariumPlugin): ObsidianDesign {
	const { registry, host } = plugin;
	return {
		adapter: plugin.app.vault.adapter,
		registry,
		host,
		jobs: plugin.assistant.jobs,
	};
}
