import { requestUrl } from "obsidian";
import type { App, WorkspaceLeaf } from "obsidian";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import { MountedCanvasHost, projectCanvasParts } from "@widgetarium/canvas/module";
import type { CanvasMount, CanvasParts, ReturnTo } from "@widgetarium/canvas/module";
import { vaultCanvasParts } from "@widgetarium/canvas/vault";
import type { VaultDesign } from "@widgetarium/canvas/vault";
import type WidgetariumPlugin from "../main.js";

export type DesignHeld = { readonly kind: "vault" } | { readonly kind: "project"; readonly project: StartedProject };

export const HELD_IN_VAULT: DesignHeld = { kind: "vault" };

const NO_NOTE_TO_RETURN_TO = "{app} has no page with a note to go back to.";

export function partsFor(plugin: WidgetariumPlugin, held: DesignHeld, mount: CanvasMount): CanvasParts {
	const canvasHost = new MountedCanvasHost(mount);
	if (held.kind === "project") return projectCanvasParts(held.project, canvasHost);
	return vaultCanvasParts(vaultDesignOf(plugin), canvasHost);
}

export function returnToNoteIn(obsidian: App, leafOf: () => WorkspaceLeaf, app: string): ReturnTo {
	return { kind: "note", open: (note) => noteOpened(obsidian, leafOf(), note, app) };
}

async function noteOpened(obsidian: App, leaf: WorkspaceLeaf, note: string | null, app: string): Promise<void> {
	const file = note ? obsidian.vault.getFileByPath(note) : null;
	if (!file) throw new Error(NO_NOTE_TO_RETURN_TO.replace("{app}", app));
	await leaf.openFile(file, { active: true });
}

function vaultDesignOf(plugin: WidgetariumPlugin): VaultDesign {
	const { registry, host } = plugin;
	return { adapter: plugin.app.vault.adapter, registry, host, jobs: plugin.assistant.jobs, fetchUrl: requestUrl };
}
