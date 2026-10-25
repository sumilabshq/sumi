import type { KeptChats } from "../../shared/schema/chat.schema.js";
import { WorkspaceChatsGateway } from "./workspace-chats.gateway.js";

const NO_CHATS: KeptChats = {
	chats: [],
	openOnStartId: null,
};

export class MemoryWorkspaceChatsGateway extends WorkspaceChatsGateway {
	private readonly held: Map<string, KeptChats>;

	constructor(chatsByWorkspace: Readonly<Record<string, KeptChats>> = {}) {
		super();
		this.held = new Map(Object.entries(chatsByWorkspace));
	}

	chatsIn(workspaceId: string): Promise<KeptChats> {
		return Promise.resolve(this.held.get(workspaceId) ?? NO_CHATS);
	}

	saveChatToOpenIn(workspaceId: string, chatId: string): Promise<void> {
		this.held.set(workspaceId, {
			...(this.held.get(workspaceId) ?? NO_CHATS),
			openOnStartId: chatId,
		});
		return Promise.resolve();
	}
}
