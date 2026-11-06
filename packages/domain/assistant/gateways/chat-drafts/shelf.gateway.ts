import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import type { ChatDraftShelf } from "../../shared/host/chat-drafts.host.js";
import { ChatDraftsGateway } from "./chat-drafts.gateway.js";
import type { ChatDraft } from "./chat-drafts.gateway.js";
import { isDrafted } from "../../shared/lib/chat-drafts.js";

export class ShelfChatDraftsGateway extends ChatDraftsGateway {
	private opened: string | null = null;
	private unseen: string | null = null;

	constructor(
		private readonly shelf: ChatDraftShelf,
		port: AssistantPort,
	) {
		super();
		port.lendDrafts?.((chatId) => isDrafted(shelf.draftOf(chatId)));
	}

	problemOf(chatId: string): string | null {
		return this.shelf.problemOf(chatId);
	}

	unseenSaid(): string | null {
		return this.unseen;
	}

	saveUnseenSaid(said: string | null): void {
		this.unseen = said;
	}

	openChat(): string | null {
		return this.opened;
	}

	saveOpenChat(chatId: string): void {
		this.opened = chatId;
	}

	chatDraft(chatId: string): ChatDraft | null {
		return this.shelf.draftOf(chatId);
	}

	saveChatDraft(chatId: string, draft: ChatDraft): void {
		this.shelf.keep(chatId, draft);
	}
}
