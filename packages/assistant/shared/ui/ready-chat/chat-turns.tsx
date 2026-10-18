import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import type { AgentSetup } from "../../schema/agent-setup.schema.js";
import type { Chat } from "../../schema/chat.schema.js";
import { EmptyChat } from "../../../features/agent/ui/empty-chat/empty-chat.js";
import { Turn } from "../../../features/chat/ui/turn/turn.js";
import type { CardAsks, ChatCardsSlot } from "../../lib/chat-cards-slot.js";
import { BusyLine } from "./busy-line.js";
import { EndLine } from "./end-line.js";

export interface ChatTurnsProps {
	readonly chat: Chat;
	readonly setup: AgentSetup;
	readonly cards: ChatCardsSlot;
	readonly asks: CardAsks;
}

export function ChatTurns({ chat, setup, cards, asks }: ChatTurnsProps): ReactElement {
	const { session } = chat;

	if (session.turns.length === 0) {
		return <EmptyChat />;
	}

	return (
		<Fragment>
			{chat.turns.map((shown, at) => {
				const isLast = at === chat.turns.length - 1;
				const isLive = session.busy && isLast;
				const turnAt = { at, isAnswerable: isLast && !session.busy, isLive };
				const { before, after } = cards.around(chat.cards, turnAt, asks);
				return (
					<Fragment key={at}>
						{before}
						<Turn shown={shown} render={setup.renderMarkdown} live={isLive} />
						{after}
					</Fragment>
				);
			})}
			<BusyLine chat={chat} />
			<EndLine chat={chat} />
		</Fragment>
	);
}
