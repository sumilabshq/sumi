import { portForChat } from "@widgetarium/core/engine/assistant-port.js";
import type { ChatKey } from "../../shared/schema/chat-key.schema.js";
import type { AssistantHosts } from "./assistant-parts.gateway.js";

export function hostForChat(host: AssistantHosts, chat: ChatKey): AssistantHosts {
	if (chat === null) {
		return host;
	}

	if (host.kind === "tauri") {
		return {
			...host,
			tauriAssistant: portForChat(host.tauriAssistant, chat),
		};
	}

	if (host.kind === "obsidian") {
		return {
			...host,
			obsidianAssistant: portForChat(host.obsidianAssistant, chat),
		};
	}

	return {
		...host,
		webAssistant: portForChat(host.webAssistant, chat),
	};
}
