import { Device, module } from "@widgetarium/core/requests";
import { ChatsChangedEvent } from "./gateways/chats/chats.events.js";
import { workspacesPartsOn } from "./gateways/workspaces-parts/workspaces-parts.gateway.js";
import {
	ChatToOpenQuery,
	WorkspaceCrumbQuery,
	ChatListQuery,
	RereadChatListSubscriber,
	RereadChatsSubscriber,
	RereadCrumbForCurrentSubscriber,
	RereadCrumbForWorkspacesSubscriber,
	CreateChatCommand,
	PinChatCommand,
	PlaceChatCommand,
	RecordChatTurnCommand,
	RenameChatCommand,
	MarkChatSeenCommand,
	ForgetChatToOpenCommand,
} from "./features/chats/requests.js";
import {
	ChatsElsewhereQuery,
	CreateWorkspaceCommand,
	OpenChatElsewhereCommand,
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
		RereadCrumbForWorkspacesSubscriber,
		RereadCrumbForCurrentSubscriber,
		RereadWorkspacesSubscriber,
		RereadWorkspacesForCurrentSubscriber,
	)
	.public(
		WorkspacesQuery,
		ChatListQuery,
		WorkspaceCrumbQuery,
		ChatToOpenQuery,
		ChatsElsewhereQuery,
		OpenWorkspaceCommand,
		OpenChatElsewhereCommand,
		OpenWorkspaceByPositionCommand,
		CreateWorkspaceCommand,
		RenameWorkspaceCommand,
		SetWorkspaceIconCommand,
		CreateChatCommand,
		MarkChatSeenCommand,
		ForgetChatToOpenCommand,
		PinChatCommand,
		PlaceChatCommand,
		RenameChatCommand,
		RecordChatTurnCommand,
		ChatsChangedEvent,
	)
	.provide((facts) => workspacesPartsOn(facts));
