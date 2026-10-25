import type { DraftAttachment } from "../draft-attachments/draft-attachments.gateway.js";

export interface ChatDraft {
	readonly said: string;
	readonly attachments: readonly DraftAttachment[];
}

export abstract class ChatDraftsGateway {
	abstract openChat(): string | null;
	abstract saveOpenChat(chatId: string): void;
	abstract chatDraft(chatId: string): ChatDraft | null;
	abstract saveChatDraft(chatId: string, draft: ChatDraft): void;
}
