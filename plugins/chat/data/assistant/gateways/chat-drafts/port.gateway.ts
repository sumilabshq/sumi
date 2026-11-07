import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { isDrafted } from "../../shared/lib/chat-drafts.js";
import { MemoryChatDraftsGateway } from "./memory.gateway.js";

export class PortChatDraftsGateway extends MemoryChatDraftsGateway {
	constructor(port: AssistantPort) {
		super();
		port.lendDrafts?.((chatId) => isDrafted(this.chatDraft(chatId)));
	}
}
