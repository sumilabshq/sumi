import type { HostFacts, Platform } from "@widgetarium/data-framework";
import type { WorkspacesHost } from "../../shared/host/workspaces.host.js";
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

export function workspacesPartsOn({ platform, scope, host }: HostFacts<WorkspacesHost>): WorkspacesParts {
	if (host.kind === "tauri") {
		return tauriWorkspacesParts(scope.workspaceId, host.store);
	}

	return UNHOSTED_PARTS_ON[platform](scope.workspaceId);
}
