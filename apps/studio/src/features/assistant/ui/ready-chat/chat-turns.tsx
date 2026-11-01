import { Fragment, createElement as h, useContext } from "react";
import type { ReactElement } from "react";
import { EmptyChat } from "../empty-chat/empty-chat.js";
import { CompactLine } from "../compact-line/compact-line.js";
import { Turn } from "../turn/turn.js";
import { Starters } from "../starters/starters.js";
import type { CardAsks, ChatCardsSlot } from "../../lib/chat-cards-slot.js";
import { BusyLine } from "./busy-line.js";
import { EndLine } from "./end-line.js";
import type { Chat } from "@widgetarium/assistant";
import { ChatMarkdownContext } from "../../lib/chat-markdown.js";

export interface ChatTurnsProps {
	readonly chat: Chat;
	readonly cards: ChatCardsSlot;
	readonly asks: CardAsks;
}

export function ChatTurns({ chat, cards, asks }: ChatTurnsProps): ReactElement {
	const render = useContext(ChatMarkdownContext);
	const { session } = chat;

	if (session.turns.length === 0) {
		return <EmptyChat starters={<Starters />} />;
	}

	return (
		<Fragment>
			{chat.turns.map((shown, at) => {
				const isLast = at === chat.turns.length - 1;
				const isLive = session.busy && isLast;
				const turnAt = { at, isAnswerable: isLast && !session.busy, isLive };
				const { before, after } = cards.around(session, turnAt, asks);
				return (
					<Fragment key={at}>
						{before}
						{shown.turn.role === "compact" ? (
							<CompactLine turn={shown.turn} render={render} live={isLive} />
						) : (
							<Turn shown={shown} render={render} live={isLive} />
						)}
						{after}
					</Fragment>
				);
			})}
			<BusyLine chat={chat} />
			<EndLine chat={chat} />
		</Fragment>
	);
}
