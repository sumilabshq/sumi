import type { ChatDraft } from "../schema/chat-draft.schema.js";

export interface ChatDraftShelf {
	draftOf(chatId: string): ChatDraft | null;
	keep(chatId: string, draft: ChatDraft): void;
	problemOf(chatId: string): string | null;
	ready(chatId: string): Promise<void>;
}
