import { event, gatewayEvent } from "@widgetarium/data-framework";
import { ChatKeySchema } from "../../shared/schema/chat-key.schema.js";
import { ChatFileDragEventSchema } from "../../shared/schema/file-drag.schema.js";
import { ChatPartsGateway } from "./chat-parts.gateway.js";

export const AssistantSessionChangedEvent = event("assistant-session-changed")
	.input(ChatKeySchema)
	.from(gatewayEvent(ChatPartsGateway, (gateway, fire) => gateway.sessionChanged((chat) => fire({ chat }))));

export const AssistantSetupChangedEvent = event("assistant-setup-changed").from(
	gatewayEvent(ChatPartsGateway, (gateway, fire) => gateway.setupChanged(fire)),
);

export const ClaudeOptionsChangedEvent = event("claude-options-changed").from(
	gatewayEvent(ChatPartsGateway, (gateway, fire) => gateway.claudeOptionsChanged(fire)),
);

export const WorkingFolderChangedEvent = event("working-folder-changed").from(
	gatewayEvent(ChatPartsGateway, (gateway, fire) => gateway.workingFolderChanged(fire)),
);

export const FileDraggedEvent = event("file-dragged")
	.public()
	.input(ChatFileDragEventSchema)
	.from(gatewayEvent(ChatPartsGateway, (gateway, fire) => gateway.fileDragged((chat, drag) => fire({ chat, drag }))));
