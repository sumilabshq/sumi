import type { ActiveChat, ActiveChatPort } from "@widgetarium/core/engine/active-chat-port.js";
import { ActiveChatGateway } from "./active-chat.gateway.js";

export class PortActiveChatGateway extends ActiveChatGateway {
	constructor(private readonly activeChat: ActiveChatPort) {
		super();
	}

	now(): ActiveChat {
		return this.activeChat.now();
	}

	watch(changed: () => void): () => void {
		return this.activeChat.watch(changed);
	}
}
