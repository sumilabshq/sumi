import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Chat } from "@widgetarium/assistant/contract";
import { useFailureLine } from "../../../../shared/lib/failure-line.js";
import { NO_CHAT_CARDS_SLOT } from "../../lib/chat-cards-slot.js";
import type { CardAsks } from "../../lib/chat-cards-slot.js";
import { ChatScroll } from "../ready-chat/chat-scroll.js";
import { ChatTurns } from "../ready-chat/chat-turns.js";

export interface ReadOnlyChatProps {
	readonly chat: Chat;
}

export function ReadOnlyChat({ chat }: ReadOnlyChatProps): ReactElement {
	const { report } = useFailureLine();
	const asks: CardAsks = {
		report,
		send: () => Promise.resolve(false),
		attach: () => undefined,
		runDetached: () => undefined,
	};
	return (
		<div className="wg-root wg-studio-ai-host">
			<div className="wg-studio-ai">
				<ChatScroll>
					<ChatTurns chat={chat} cards={NO_CHAT_CARDS_SLOT} asks={asks} report={report} />
				</ChatScroll>
			</div>
		</div>
	);
}
