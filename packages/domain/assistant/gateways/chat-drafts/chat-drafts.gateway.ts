import type { ChatDraft } from "../../shared/schema/chat-draft.schema.js";

export type { ChatDraft };

export abstract class ChatDraftsGateway {
	abstract openChat(): string | null;
	abstract saveOpenChat(chatId: string): void;
	abstract chatDraft(chatId: string): ChatDraft | null;
	abstract saveChatDraft(chatId: string, draft: ChatDraft): void;
	abstract unseenSaid(): string | null;
	abstract problemOf(chatId: string): string | null;
	abstract saveUnseenSaid(said: string | null): void;
}
