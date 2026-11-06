import type { AssistantHosts } from "@widgetarium/assistant/module";
import { portForChat } from "@widgetarium/core/engine/assistant-port.js";
import type { StartedApp } from "@widgetarium/data-framework";
import { chatAppOf } from "./chat-app.js";
import type { ChatAppAsk } from "./chat-app.js";

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

export function hostForChat(host: AssistantHosts, chatId: string): AssistantHosts {
	if (host.kind === "tauri") {
		return {
			...host,
			tauriAssistant: portForChat(host.tauriAssistant, chatId),
		};
	}

	if (host.kind === "obsidian") {
		return {
			...host,
			obsidianAssistant: portForChat(host.obsidianAssistant, chatId),
		};
	}

	return {
		...host,
		webAssistant: portForChat(host.webAssistant, chatId),
	};
}
