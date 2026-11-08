import { event, gatewayEvent } from "@widgetarium/data-framework";
import { ChatKeySchema } from "../../shared/schema/chat-key.schema.js";
import { ChatFileDragEventSchema } from "../../shared/schema/file-drag.schema.js";
import { ChatPartsGateway } from "./chat-parts.gateway.js";

export const assistantSessionChanged = event()
	.input(ChatKeySchema)
	.from(gatewayEvent(ChatPartsGateway, (gateway, fire) => gateway.sessionChanged((chat) => fire({ chat }))));

export const assistantSetupChanged = event().from(
	gatewayEvent(ChatPartsGateway, (gateway, fire) => gateway.setupChanged(fire)),
);

export const claudeOptionsChanged = event().from(
	gatewayEvent(ChatPartsGateway, (gateway, fire) => gateway.claudeOptionsChanged(fire)),
);

export const workingFolderChanged = event().from(
	gatewayEvent(ChatPartsGateway, (gateway, fire) => gateway.workingFolderChanged(fire)),
);

export const fileDragged = event()
	.public()
	.input(ChatFileDragEventSchema)
	.from(gatewayEvent(ChatPartsGateway, (gateway, fire) => gateway.fileDragged((chat, drag) => fire({ chat, drag }))));
