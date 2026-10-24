import type { ActiveChat } from "@widgetarium/core/engine/active-chat-port.js";

export abstract class ActiveChatGateway {
	abstract now(): ActiveChat;
	abstract watch(changed: () => void): () => void;
}
