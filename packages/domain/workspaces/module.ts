import { Device, module } from "@widgetarium/core/requests";
import { workspacesPartsOn } from "./gateways/workspaces-parts/workspaces-parts.gateway.js";
import {
	ActiveChatQuery,
	ChatCrumbQuery,
	ChatListQuery,
	CreateChatCommand,
	PinChatCommand,
	RecordChatTurnCommand,
	RenameChatCommand,
	SelectChatCommand,
} from "./features/chats/requests.js";
import {
	CreateWorkspaceCommand,
	OpenWorkspaceByPositionCommand,
	OpenWorkspaceCommand,
	RenameWorkspaceCommand,
	SetWorkspaceIconCommand,
	WorkspacesQuery,
} from "./features/workspaces/requests.js";

export const WorkspacesModule = module("workspaces")
	.on(Device)
	.public(
		WorkspacesQuery,
		ChatListQuery,
		ChatCrumbQuery,
		ActiveChatQuery,
		OpenWorkspaceCommand,
		OpenWorkspaceByPositionCommand,
		CreateWorkspaceCommand,
		RenameWorkspaceCommand,
		SetWorkspaceIconCommand,
		CreateChatCommand,
		SelectChatCommand,
		PinChatCommand,
		RenameChatCommand,
		RecordChatTurnCommand,
	)
	.provide((facts) => workspacesPartsOn(facts));
