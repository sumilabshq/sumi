import { createElement as h } from "react";
import type { ReactElement, ReactNode } from "react";
import { ASSISTANT_NOT_AVAILABLE } from "@widgetarium/core/engine/assistant-port.js";
import { Toaster } from "@widgetarium/kit";
import { OnRefused, useQuery } from "@widgetarium/core/requests";
import { toastsAttachmentRefusals } from "../../lib/refusals-shown.js";
import { NO_CHAT_CARDS_SLOT } from "../../lib/chat-cards-slot.js";
import type { ChatCardsSlot } from "../../lib/chat-cards-slot.js";
import { AssistantChat } from "../assistant-chat/assistant-chat.js";
import { ChatLeadHead } from "../chat-lead/chat-lead.js";
import { ChatQuery } from "@widgetarium/assistant";

export interface AssistantPanelProps {
	readonly lead?: ReactNode;
	readonly title?: string | undefined;
	readonly cards?: ChatCardsSlot | undefined;
	readonly chatId?: string | undefined;
}

export function AssistantPanel({ lead, title, cards = NO_CHAT_CARDS_SLOT, chatId }: AssistantPanelProps): ReactElement {
	const { data: chat } = useQuery(ChatQuery);
	return (
		<div className="wg-root wg-studio-ai-host">
			{chat.isAvailable ? (
				<OnRefused value={toastsAttachmentRefusals}>
					<AssistantChat lead={lead} title={title} cards={cards} chatId={chatId} />
					<Toaster />
				</OnRefused>
			) : (
				<div className="wg-studio-ai">
					<ChatLeadHead lead={lead} title={title} />
					<p className="wg-studio-ai-quiet">{ASSISTANT_NOT_AVAILABLE}</p>
				</div>
			)}
		</div>
	);
}
