import { ChatDraftsGateway } from "./chat-drafts.gateway.js";
import type { ChatDraft } from "./chat-drafts.gateway.js";

export class MemoryChatDraftsGateway extends ChatDraftsGateway {
	private opened: string | null = null;
	private readonly drafts = new Map<string, ChatDraft>();

	openChat(): string | null {
		return this.opened;
	}

	saveOpenChat(chatId: string): void {
		this.opened = chatId;
	}

	chatDraft(chatId: string): ChatDraft | null {
		return this.drafts.get(chatId) ?? null;
	}

	saveChatDraft(chatId: string, draft: ChatDraft): void {
		if (draft.said === "" && draft.attachments.length === 0) {
			this.drafts.delete(chatId);
			return;
		}

		this.drafts.set(chatId, draft);
	}
}
