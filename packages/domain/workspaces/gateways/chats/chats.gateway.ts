import type { KeptChats } from "../../shared/schema/chat.schema.js";

export abstract class ChatsGateway {
	abstract chats(): KeptChats;
	abstract saveChats(chats: KeptChats, reason: string): void;
	abstract chatsChanged(listener: () => void): () => void;
	abstract isLoaded(): boolean;
}
