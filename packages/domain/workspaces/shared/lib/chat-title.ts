import { NEW_CHAT_TITLE } from "@widgetarium/core/engine/focused-chat-port.js";
import type { KeptChat } from "../schema/chat.schema.js";

export function titleOf(chat: KeptChat): string {
	return chat.title ?? NEW_CHAT_TITLE;
}

export function withCapitalFirst(title: string): string {
	const [firstWord = ""] = title.split(/\s/u);

	if (firstWord !== firstWord.toLocaleLowerCase()) {
		return title;
	}

	const [first = ""] = title;
	return `${first.toLocaleUpperCase()}${title.slice(first.length)}`;
}
