import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import type { ChatDraft } from "./chat-drafts.gateway.js";
import { MemoryChatDraftsGateway } from "./memory.gateway.js";

export class PortChatDraftsGateway extends MemoryChatDraftsGateway {
	constructor(port: AssistantPort) {
		super();
		port.lendDrafts?.((chatId) => isDrafted(this.chatDraft(chatId)));
	}
}

function isDrafted(draft: ChatDraft | null): boolean {
	return draft !== null && (draft.said.trim() !== "" || draft.attachments.length > 0);
}
