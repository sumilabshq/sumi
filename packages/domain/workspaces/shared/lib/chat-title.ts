import { NEW_CHAT_TITLE } from "@widgetarium/core/engine/focused-chat-port.js";
import type { KeptChat } from "../schema/chat.schema.js";

export function titleOf(chat: KeptChat): string {
	return chat.title ?? NEW_CHAT_TITLE;
}
