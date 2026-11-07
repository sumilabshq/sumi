import { Anywhere, PublicGuard, module } from "@widgetarium/data-framework";
import { FileDraggedEvent } from "./gateways/chat-parts/chat-parts.events.js";
import { chatPartsOn } from "./gateways/assistant-parts/chat-parts-on.js";
import type { AssistantHosts } from "./gateways/assistant-parts/assistant-parts.gateway.js";
import {
	RereadAgentSetupSubscriber,
	RereadClaudeOptionsSubscriber,
	RereadWorkingFoldersSubscriber,
	AgentSetupQuery,
	ChooseClaudeModelCommand,
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
	AssistantCallersGuard,
	ChatQuery,
	RetryTurnCommand,
	StopTurnCommand,
	ChangeQueueCommand,
	SendTextCommand,
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
	AdoptDraftCommand,
	TakeDraftCommand,
	DraftAttachmentsQuery,
	FileDragQuery,
	HearPageDragCommand,
	RemoveAttachmentCommand,
	SendMessageCommand,
	SweepAttachmentsCommand,
} from "./features/composer/requests.js";
import { ComposerPrefillQuery, PrefillDraftCommand, TakePrefillCommand } from "./features/prefill/requests.js";
import {
	CompactChatCommand,
	RereadSlashCommandsSubscriber,
	SlashCommandsQuery,
} from "./features/slash-commands/requests.js";

export type { AssistantHosts } from "./gateways/assistant-parts/assistant-parts.gateway.js";

export const AssistantModule = module("assistant")
	.on(Anywhere)
	.config<AssistantHosts>()
	.subscribers(
		RereadAgentSetupSubscriber,
		RereadClaudeOptionsSubscriber,
		RereadWorkingFoldersSubscriber,
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
		ChooseClaudeModelCommand,
		WorkingFoldersQuery,
		ChooseWorkingFolderCommand,
		PickWorkingFolderCommand,
		ChatQuery,
		RetryTurnCommand,
		StopTurnCommand,
		ChangeQueueCommand,
		SendTextCommand,
		DraftAttachmentsQuery,
		ComposerPrefillQuery,
		PrefillDraftCommand,
		TakePrefillCommand,
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
		TakeDraftCommand,
		AdoptDraftCommand,
		CompactChatCommand,
		FileDraggedEvent,
	)
	.guard(PublicGuard)
	.guard(AssistantCallersGuard)
	.provide((facts) => chatPartsOn(facts));
