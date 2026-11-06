import type { ConfigFacts, Platform } from "@widgetarium/data-framework";
import type { WorkspacesConfig } from "../../shared/host/workspaces.host.js";
import type { ChatsGateway } from "../chats/chats.gateway.js";
import type { CurrentWorkspaceGateway } from "../current-workspace/current-workspace.gateway.js";
import type { WorkspaceChatsGateway } from "../workspace-chats/workspace-chats.gateway.js";
import type { WorkspacesGateway } from "../workspaces/workspaces.gateway.js";
import { tauriWorkspacesParts } from "./tauri.gateway.js";
import { webWorkspacesParts } from "./web.gateway.js";

export type WorkspacesParts = {
	readonly workspaceChats: WorkspaceChatsGateway;
	readonly workspaces: WorkspacesGateway;
	readonly currentWorkspace: CurrentWorkspaceGateway;
	readonly chats: ChatsGateway;
};

const UNHOSTED_PARTS_ON: Readonly<Record<Platform, (workspaceId: string) => WorkspacesParts>> = {
	browser: webWorkspacesParts,
	tauri: webWorkspacesParts,
	server: webWorkspacesParts,
};

export function workspacesPartsOn({ platform, scope, config }: ConfigFacts<WorkspacesConfig>): WorkspacesParts {
	if (config.tauri !== undefined) {
		return tauriWorkspacesParts(scope.workspaceId, config.tauri.store);
	}

	return UNHOSTED_PARTS_ON[platform](scope.workspaceId);
}
