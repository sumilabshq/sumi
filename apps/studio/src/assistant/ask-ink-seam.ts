import { PrefillDraftCommand } from "@widgetarium/assistant";
import { OpenNewChatCommand } from "@widgetarium/app-host";
import type { StartedApp } from "@widgetarium/core/requests";
import { focusedChatPortOf } from "../chats-column/focused-chat.js";
import type { AskInk } from "../features/command-menu/lib/ask-ink-context.js";

export function askInkSenderOf(studioApp: StartedApp, chatAppFor: (chatId: string) => StartedApp): AskInk {
	return (text) => {
		if (text.trim() === "") {
			return;
		}

		void fillFocusedChat(studioApp, chatAppFor, text);
	};
}

async function fillFocusedChat(
	studioApp: StartedApp,
	chatAppFor: (chatId: string) => StartedApp,
	text: string,
): Promise<void> {
	const chatId = focusedChatPortOf(studioApp).now()?.id ?? (await newChatIdIn(studioApp));

	if (chatId === null) {
		return;
	}

	const answer = await chatAppFor(chatId).send(PrefillDraftCommand, { text });

	if (!answer.ok) {
		console.error(`[widgetarium] Ask Sumi could not fill the composer of chat ${chatId}: ${answer.reason}`);
	}
}

async function newChatIdIn(studioApp: StartedApp): Promise<string | null> {
	const opened = await studioApp.send(OpenNewChatCommand, { title: null });

	if (!opened.ok) {
		console.error(`[widgetarium] Ask Sumi found no chat on this board and could not open one: ${opened.reason}`);
		return null;
	}

	return opened.output.id;
}
