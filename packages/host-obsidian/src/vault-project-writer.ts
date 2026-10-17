import type { Vault } from "obsidian";
import { joinProjectPath, type ProjectWriter } from "@widgetarium/core/project/index.js";

export type ProjectVault = Pick<Vault, "getAbstractFileByPath" | "createFolder" | "create">;

export function vaultProjectWriter(vault: ProjectVault, projectFolder: string): ProjectWriter {
	return {
		write: async (at, text) => {
			const inVault = joinProjectPath(projectFolder, at);
			for (const folder of foldersAbove(inVault)) {
				if (vault.getAbstractFileByPath(folder) === null) await vault.createFolder(folder);
			}
			await vault.create(inVault, text);
		},
	};
}

function foldersAbove(path: string): string[] {
	const segments = path.split("/");
	return segments.slice(0, -1).map((_segment, at) => segments.slice(0, at + 1).join("/"));
}
