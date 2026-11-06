import { Fragment, createElement as h, useState } from "react";
import type { ReactElement } from "react";
import { MessageScrollerItem } from "@widgetarium/kit";
import { CompactLine } from "../compact-line/compact-line.js";
import { Turn } from "../turn/turn.js";
import type { CardAsks, ChatCardsSlot } from "../../lib/chat-cards-slot.js";
import { LiveGroup } from "../live-group/live-group.js";
import { liveToolsOf } from "../../lib/live-tools.js";
import { OpenGroupsContext } from "../../lib/use-remembers-group-open.js";
import { EndLine } from "./end-line.js";
import { NoTurns } from "./no-turns.js";
import type { Chat } from "@widgetarium/assistant";
import { renderMarkdown } from "../../../markdown/render-markdown.js";

export interface ChatTurnsProps {
	readonly chat: Chat;
	readonly cards: ChatCardsSlot;
	readonly asks: CardAsks;
	readonly chatId?: string | undefined;
}

const WAITING_KEY = "waiting";

export function ChatTurns({ chat, cards, asks, chatId }: ChatTurnsProps): ReactElement {
	const [openGroups] = useState(() => new Set<string>());
	const { session } = chat;

	if (session.turns.length === 0) {
		return <NoTurns />;
	}

	const live = liveToolsOf(chat);
	return (
		<OpenGroupsContext.Provider value={openGroups}>
			{chat.turns.map((shown, at) => {
				const isLast = at === chat.turns.length - 1;
				const isLive = session.busy && isLast;
				const turnAt = { at, isAnswerable: isLast && !session.busy, isLive };
				const { before, after } = cards.around(session, turnAt, asks);

				if (isLast && live.isLastTurnEmptied) {
					return (
						<Fragment key={at}>
							{before}
							{after}
						</Fragment>
					);
				}

				return (
					<MessageScrollerItem key={at} messageId={`turn-${at}`} className="wg-studio-ai-row">
						{before}
						{shown.turn.role === "compact" ? (
							<CompactLine turn={shown.turn} render={renderMarkdown} live={isLive} />
						) : (
							<Turn
								shown={shown}
								render={renderMarkdown}
								live={isLive}
								hasLiveGroup={isLive && live.step !== null}
							/>
						)}
						{after}
					</MessageScrollerItem>
				);
			})}
			{live.isShown ? (
				<LiveGroup
					key={live.step?.calls[0]?.ref ?? WAITING_KEY}
					calls={live.step?.calls ?? []}
					faces={live.step?.faces ?? []}
					session={session}
					chatId={chatId}
				/>
			) : null}
			<EndLine chat={chat} />
		</OpenGroupsContext.Provider>
	);
}
