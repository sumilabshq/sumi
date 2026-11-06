import type { HostApp, StudioHostPort } from "@widgetarium/core/engine/studio-host.js";
import type { StartedApp } from "@widgetarium/data-framework";
import { CreateWorkspaceCommand, OpenWorkspaceCommand } from "@widgetarium/workspaces";
import type { WorkspaceClient } from "./workspace-client.js";
import type { WorkspaceEntry } from "./workspace-docs.js";

export type WorkspaceApps = Pick<StudioHostPort, "apps" | "openApp" | "createApp" | "renameApp">;

export interface WorkspaceAppsAsk {
	readonly workspaces: WorkspaceClient;
	readonly workspacesApp: StartedApp;
}

export const FOLDER_NOT_FOUND = "folder not found · Locate";

export function tauriWorkspaceApps({ workspaces, workspacesApp }: WorkspaceAppsAsk): WorkspaceApps {
	return {
		apps: async () => (await workspaces.list()).map(hostAppOf),
		openApp: async (id) => {
			await workspacesApp.send(OpenWorkspaceCommand, { id });
		},
		createApp: async () => {
			await workspacesApp.send(CreateWorkspaceCommand);
		},
		renameApp: (id, name) => workspaces.rename(id, name),
	};
}

export function isFolderMissing(entry: WorkspaceEntry): boolean {
	return entry.folder !== null && !entry.folderFound;
}

function hostAppOf(entry: WorkspaceEntry): HostApp {
	const app = {
		id: entry.id,
		name: entry.name,
		pages: 0,
		firstPage: null,
	};
	if (!isFolderMissing(entry)) {
		return app;
	}

	return {
		...app,
		refusal: FOLDER_NOT_FOUND,
	};
}
