import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useOptionalQuery } from "@widgetarium/data-framework";
import type { ChatCardsSlot } from "../../lib/chat-cards-slot.js";
import { ReadyChat } from "../ready-chat/ready-chat.js";
import { SetupUnread } from "../setup-unread/setup-unread.js";
import { AgentSetupQuery } from "@widgetarium/assistant";

export interface AssistantChatProps {
	readonly lead?: ReactNode;
	readonly title?: string | undefined;
	readonly cards: ChatCardsSlot;
	readonly chatId?: string | undefined;
}

const NOT_READ = "The assistant's setup could not be read: {why}";

export function AssistantChat({ lead, title, cards, chatId }: AssistantChatProps): ReactElement {
	const { data: setup, failure } = useOptionalQuery(AgentSetupQuery, { chat: chatId ?? null });

	if (setup === null && failure === null) {
		return <SetupUnread lead={lead} title={title} />;
	}

	const setupFailure = failure === null ? null : NOT_READ.replace("{why}", failure);
	return <ReadyChat setupFailure={setupFailure} lead={lead} title={title} cards={cards} chatId={chatId} />;
}
