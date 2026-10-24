import { Device, module } from "@widgetarium/core/requests";
import { ChatsChangedEvent } from "./gateways/chats/chats.events.js";
import { workspacesPartsOn } from "./gateways/workspaces-parts/workspaces-parts.gateway.js";
import {
	ActiveChatQuery,
	ChatCrumbQuery,
	ChatListQuery,
	RereadChatListSubscriber,
	RereadChatsSubscriber,
	RereadChatCrumbForCurrentSubscriber,
	RereadChatCrumbForWorkspacesSubscriber,
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
	RereadWorkspacesForCurrentSubscriber,
	RereadWorkspacesSubscriber,
	WorkspacesQuery,
} from "./features/workspaces/requests.js";

export const WorkspacesModule = module("workspaces")
	.on(Device)
	.subscribers(
		RereadChatsSubscriber,
		RereadChatListSubscriber,
		RereadChatCrumbForWorkspacesSubscriber,
		RereadChatCrumbForCurrentSubscriber,
		RereadWorkspacesSubscriber,
		RereadWorkspacesForCurrentSubscriber,
	)
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
		ChatsChangedEvent,
	)
	.provide((facts) => workspacesPartsOn(facts));
