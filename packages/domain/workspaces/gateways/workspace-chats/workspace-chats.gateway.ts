import type { KeptChats } from "../../shared/schema/chat.schema.js";

export abstract class WorkspaceChatsGateway {
	abstract chatsIn(workspaceId: string): Promise<KeptChats>;
	abstract saveChatToOpenIn(workspaceId: string, chatId: string, reason: string): Promise<void>;
}
