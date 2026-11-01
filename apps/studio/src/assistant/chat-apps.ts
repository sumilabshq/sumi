import { portForChat } from "@widgetarium/core/engine/assistant-port.js";
import type { StartedApp } from "@widgetarium/core/requests";
import { chatAppOf } from "./chat-app.js";
import type { AssistantHostObjects, ChatAppAsk } from "./chat-app.js";

export class ChatApps {
	private readonly apps = new Map<string, StartedApp>();

	constructor(private readonly ask: ChatAppAsk) {}

	appFor(chatId: string): StartedApp {
		const started = this.apps.get(chatId) ?? this.startedFor(chatId);
		this.apps.set(chatId, started);
		return started;
	}

	private startedFor(chatId: string): StartedApp {
		console.info(`[widgetarium] chat apps ${this.apps.size} → ${this.apps.size + 1} (chat ${chatId} drawn in a pane)`);
		return chatAppOf({
			...this.ask,
			host: hostForChat(this.ask.host, chatId),
		});
	}
}

export function hostForChat(host: AssistantHostObjects, chatId: string): AssistantHostObjects {
	if (host.tauriAssistant !== undefined) {
		return {
			...host,
			tauriAssistant: portForChat(host.tauriAssistant, chatId),
		};
	}

	if (host.obsidianAssistant !== undefined) {
		return {
			...host,
			obsidianAssistant: portForChat(host.obsidianAssistant, chatId),
		};
	}

	if (host.webAssistant !== undefined) {
		return {
			...host,
			webAssistant: portForChat(host.webAssistant, chatId),
		};
	}

	return host;
}
