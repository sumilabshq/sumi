import type { App, WorkspaceLeaf } from "obsidian";
import type { StartedProject } from "@widgetarium/core/app/widgetarium-app.js";
import type { CanvasHosts, ReturnTo, VaultCanvasHosts } from "@widgetarium/studio";
import type WidgetariumPlugin from "../main.js";

export type DesignHeld = { readonly kind: "vault" } | { readonly kind: "project"; readonly project: StartedProject };

export const HELD_IN_VAULT: DesignHeld = { kind: "vault" };

const NOTE_GONE = "{note} is not in the vault any more, so the canvas cannot go back to it.";

export function hostsFor(plugin: WidgetariumPlugin, held: DesignHeld): CanvasHosts {
	if (held.kind === "project") {
		return { project: held.project };
	}

	return vaultHostsOf(plugin);
}

export function returnToNoteIn(obsidian: App, leafOf: () => WorkspaceLeaf, cameFrom: string): ReturnTo {
	return {
		kind: "note",
		cameFrom,
		open: (note) => noteOpened(obsidian, leafOf(), note),
	};
}

async function noteOpened(obsidian: App, leaf: WorkspaceLeaf, note: string): Promise<void> {
	const file = obsidian.vault.getFileByPath(note);

	if (!file) {
		throw new Error(NOTE_GONE.replace("{note}", note));
	}

	await leaf.openFile(file, { active: true });
}

function vaultHostsOf(plugin: WidgetariumPlugin): VaultCanvasHosts {
	return {
		adapter: plugin.app.vault.adapter,
		registry: plugin.registry,
		drawingHost: plugin.host,
		agentJobs: plugin.assistant.jobs,
	};
}
