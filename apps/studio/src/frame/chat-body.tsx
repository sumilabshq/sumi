import { createElement as h, useEffect } from "react";
import type { ReactElement } from "react";
import { AppProvider } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { OpenChatDraftCommand, PrefillDraftCommand } from "@widgetarium/assistant";
import { AssistantPanel } from "../features/assistant/ui/assistant-panel/assistant-panel.js";
import type { ChatCardsSlot } from "../features/assistant/lib/chat-cards-slot.js";

export interface ChatBodyProps {
	readonly chatId: string;
	readonly chatApp: StartedApp;
	readonly cards: ChatCardsSlot;
}

export function ChatBody({ chatId, chatApp, cards }: ChatBodyProps): ReactElement {
	useOpensChatDraft(chatApp, chatId);
	return (
		<div className="wg-studio-chat" data-chat-id={chatId}>
			<AppProvider app={chatApp}>
				<AssistantPanel key={chatId} cards={cards} />
			</AppProvider>
		</div>
	);
}

function useOpensChatDraft(chatApp: StartedApp, chatId: string): void {
	useEffect(() => {
		void openChatDraft(chatApp, chatId);
	}, [chatApp, chatId]);
}

async function openChatDraft(chatApp: StartedApp, chatId: string): Promise<void> {
	const opened = await chatApp.send(OpenChatDraftCommand, { chatId });

	if (!opened.ok) {
		console.error(`[widgetarium] the draft of chat ${chatId} was not opened: ${opened.reason}`);
		return;
	}

	if (opened.output.said === "") {
		return;
	}

	const filled = await chatApp.send(PrefillDraftCommand, { text: opened.output.said });

	if (!filled.ok) {
		console.error(`[widgetarium] the draft of chat ${chatId} was not put back: ${filled.reason}`);
	}
}
