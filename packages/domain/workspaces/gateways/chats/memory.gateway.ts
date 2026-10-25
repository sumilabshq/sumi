import type { KeptChats } from "../../shared/schema/chat.schema.js";
import { ChatsGateway } from "./chats.gateway.js";

export class MemoryChatsGateway extends ChatsGateway {
	private readonly listeners = new Set<() => void>();

	constructor(private held: KeptChats) {
		super();
	}

	chats(): KeptChats {
		return this.held;
	}

	saveChats(chats: KeptChats): void {
		this.held = chats;
		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	isLoaded(): boolean {
		return true;
	}

	chatsChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
