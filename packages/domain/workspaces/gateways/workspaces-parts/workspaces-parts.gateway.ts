import type { ModuleFacts, Platform } from "@widgetarium/framework";
import type { ChatsGateway } from "../chats/chats.gateway.js";
import type { CurrentWorkspaceGateway } from "../current-workspace/current-workspace.gateway.js";
import type { WorkspaceChatsGateway } from "../workspace-chats/workspace-chats.gateway.js";
import type { WorkspacesGateway } from "../workspaces/workspaces.gateway.js";
import { tauriInvoke, tauriWorkspacesParts } from "./tauri.gateway.js";
import { webWorkspacesParts } from "./web.gateway.js";

export type WorkspacesParts = {
	readonly workspaceChats: WorkspaceChatsGateway;
	readonly workspaces: WorkspacesGateway;
	readonly currentWorkspace: CurrentWorkspaceGateway;
	readonly chats: ChatsGateway;
};

const PARTS_ON: Readonly<Record<Platform, (facts: ModuleFacts) => WorkspacesParts>> = {
	browser: ({ scope }) => webWorkspacesParts(scope.workspaceId),
	tauri: ({ scope }) => tauriWorkspacesParts(scope.workspaceId, tauriInvoke),
	server: ({ scope }) => webWorkspacesParts(scope.workspaceId),
};

export function workspacesPartsOn(facts: ModuleFacts): WorkspacesParts {
	return PARTS_ON[facts.platform](facts);
}
