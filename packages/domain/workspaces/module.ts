import { Device, module } from "@widgetarium/data-framework";
import { PlacesModule } from "@widgetarium/places";
import { ChatsChangedEvent } from "./gateways/chats/chats.events.js";
import { workspacesPartsOn } from "./gateways/workspaces-parts/workspaces-parts.gateway.js";
import type { WorkspacesConfig } from "./shared/host/workspaces.host.js";
import {
	ChatToOpenQuery,
	WorkspaceCrumbQuery,
	ChatRecordsQuery,
	RereadChatsSubscriber,
	RereadCrumbForCurrentSubscriber,
	RereadCrumbForWorkspacesSubscriber,
	CreateChatCommand,
	RecordChatTurnCommand,
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
	.imports(PlacesModule)
	.config<WorkspacesConfig>()
	.subscribers(
		RereadChatsSubscriber,
		RereadCrumbForWorkspacesSubscriber,
		RereadCrumbForCurrentSubscriber,
		RereadWorkspacesSubscriber,
		RereadWorkspacesForCurrentSubscriber,
	)
	.public(
		WorkspacesQuery,
		ChatRecordsQuery,
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
		ForgetChatToOpenCommand,
		RecordChatTurnCommand,
		ChatsChangedEvent,
	)
	.provide((facts) => workspacesPartsOn(facts));
