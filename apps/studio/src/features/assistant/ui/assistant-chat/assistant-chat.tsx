import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { useOptionalQuery } from "@widgetarium/core/requests";
import type { ChatCardsSlot } from "../../lib/chat-cards-slot.js";
import { ReadyChat } from "../ready-chat/ready-chat.js";
import { SetupUnread } from "../setup-unread/setup-unread.js";
import { AgentSetupQuery } from "@widgetarium/assistant";

export interface AssistantChatProps {
	readonly lead?: ReactNode;
	readonly title?: string | undefined;
	readonly cards: ChatCardsSlot;
}

const NOT_REREAD = "The assistant's setup could not be read again: {why}";

export function AssistantChat({ lead, title, cards }: AssistantChatProps): ReactElement {
	const { data: setup, failure } = useOptionalQuery(AgentSetupQuery);

	if (setup === null) {
		return <SetupUnread lead={lead} title={title} failure={failure} />;
	}

	const setupFailure = failure === null ? null : NOT_REREAD.replace("{why}", failure);
	return <ReadyChat setup={setup} setupFailure={setupFailure} lead={lead} title={title} cards={cards} />;
}
