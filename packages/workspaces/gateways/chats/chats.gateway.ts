import type { KeptChats } from "../../shared/schema/chat.schema.js";

export abstract class ChatsGateway {
	abstract kept(): KeptChats | null;
	abstract keep(chats: KeptChats): void;
}
