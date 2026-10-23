import type { KeptChats } from "../../shared/schema/chat.schema.js";
import { ChatsGateway } from "./chats.gateway.js";

export class MemoryChatsGateway extends ChatsGateway {
	constructor(private held: KeptChats | null = null) {
		super();
	}

	kept(): KeptChats | null {
		return this.held;
	}

	keep(chats: KeptChats): void {
		this.held = chats;
	}
}
