import { Device, module, oneOf } from "@widgetarium/core/requests";
import { FileDraggedEvent } from "./gateways/file-drop/file-drop.events.js";
import { assistantPartsOn } from "./gateways/assistant-parts/assistant-parts.gateway.js";
import { AssistantHost } from "./shared/host/assistant.host.js";
import { AttachmentsFolderHost } from "./shared/host/attachments-folder.host.js";
import { ClaudeOptionsHost } from "./shared/host/claude-options.host.js";
import { FileDropsHost } from "./shared/host/file-drops.host.js";
import { FolderLendingHost } from "./shared/host/folder-lending.host.js";
import { WorkspaceFoldersHost } from "./shared/host/workspace-folders.host.js";
import {
	RereadAgentSetupSubscriber,
	RereadClaudeOptionsSubscriber,
	AgentSetupQuery,
	ChooseClaudeOptionCommand,
	ChooseProviderCommand,
	ChooseWorkingFolderCommand,
	ClaudeOptionsQuery,
	OpenProvidersCommand,
	PickWorkingFolderCommand,
	SetHelperAgentsCommand,
	WorkingFoldersQuery,
} from "./features/agent/requests.js";
import {
	RereadChatSubscriber,
	RereadChatForAttachmentsSubscriber,
	ChatQuery,
	RetryTurnCommand,
	StopTurnCommand,
} from "./features/chat/requests.js";
import {
	AttachDroppedCommand,
	AttachFilesCommand,
	AttachFolderCommand,
	AttachReachQuery,
	ClearChatCommand,
	HearHostDragSubscriber,
	HoldDraftTextCommand,
	OpenChatDraftCommand,
	DraftAttachmentsQuery,
	FileDragQuery,
	HearPageDragCommand,
	RemoveAttachmentCommand,
	SendMessageCommand,
	SweepAttachmentsCommand,
} from "./features/composer/requests.js";
import { ComposerPrefillQuery, PrefillDraftCommand } from "./features/prefill/requests.js";
import {
	CompactChatCommand,
	RereadSlashCommandsSubscriber,
	SlashCommandsQuery,
} from "./features/slash-commands/requests.js";

export const AssistantModule = module("assistant")
	.on(Device)
	.needs(
		oneOf({
			web: {
				webAssistant: AssistantHost,
			},
			obsidian: {
				obsidianAssistant: AssistantHost,
				attachments: AttachmentsFolderHost,
			},
			tauri: {
				tauriAssistant: AssistantHost,
				tauriAttachments: AttachmentsFolderHost,
				folders: FolderLendingHost,
				claudeOptions: ClaudeOptionsHost,
				drops: FileDropsHost,
				workspace: WorkspaceFoldersHost,
			},
		}),
	)
	.subscribers(
		RereadAgentSetupSubscriber,
		RereadClaudeOptionsSubscriber,
		RereadChatSubscriber,
		RereadChatForAttachmentsSubscriber,
		RereadSlashCommandsSubscriber,
		HearHostDragSubscriber,
	)
	.public(
		AgentSetupQuery,
		ChooseProviderCommand,
		SetHelperAgentsCommand,
		OpenProvidersCommand,
		ClaudeOptionsQuery,
		ChooseClaudeOptionCommand,
		WorkingFoldersQuery,
		ChooseWorkingFolderCommand,
		PickWorkingFolderCommand,
		ChatQuery,
		RetryTurnCommand,
		StopTurnCommand,
		DraftAttachmentsQuery,
		ComposerPrefillQuery,
		PrefillDraftCommand,
		AttachFilesCommand,
		RemoveAttachmentCommand,
		SendMessageCommand,
		SweepAttachmentsCommand,
		AttachReachQuery,
		AttachFolderCommand,
		FileDragQuery,
		HearPageDragCommand,
		AttachDroppedCommand,
		SlashCommandsQuery,
		ClearChatCommand,
		HoldDraftTextCommand,
		OpenChatDraftCommand,
		CompactChatCommand,
		FileDraggedEvent,
	)
	.provide((facts) => assistantPartsOn(facts));
