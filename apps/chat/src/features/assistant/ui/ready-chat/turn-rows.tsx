import { Fragment, createElement as h } from "react";
import type { ReactElement } from "react";
import type { Chat } from "@widgetarium/assistant";
import type { CardAsks, ChatCardsSlot } from "../../lib/chat-cards-slot.js";
import type { LiveTools } from "../../lib/live-tools.js";
import { TurnRow } from "./turn-row.js";

export interface TurnRowsProps {
	readonly chat: Chat;
	readonly cards: ChatCardsSlot;
	readonly asks: CardAsks;
	readonly live: LiveTools;
}

export function TurnRows({ chat, cards, asks, live }: TurnRowsProps): ReactElement {
	const { session } = chat;
	const lastAt = chat.turns.length - 1;
	return (
		<Fragment>
			{chat.turns.map((shown, at) => {
				const isLast = at === lastAt;
				const isLive = session.busy && isLast;
				return (
					<TurnRow
						key={at}
						shown={shown}
						at={at}
						around={cards.around(session, { at, isAnswerable: isLast && !session.busy, isLive }, asks)}
						isLive={isLive}
						hasLiveGroup={isLive && live.hasGroup}
						isEmptied={isLast && live.isLastTurnEmptied}
					/>
				);
			})}
		</Fragment>
	);
}
