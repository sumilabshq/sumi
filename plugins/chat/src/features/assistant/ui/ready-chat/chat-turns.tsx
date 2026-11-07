import { createElement as h, useState } from "react";
import type { ReactElement } from "react";
import type { CardAsks, ChatCardsSlot } from "../../lib/chat-cards-slot.js";
import { liveToolsOf } from "../../lib/live-tools.js";
import { OpenGroupsContext } from "../../lib/use-remembers-group-open.js";
import { EndLine } from "./end-line.js";
import { LiveRow } from "./live-row.js";
import { NoTurns } from "./no-turns.js";
import { TurnRows } from "./turn-rows.js";
import type { Chat } from "@widgetarium/assistant";

export interface ChatTurnsProps {
	readonly chat: Chat;
	readonly cards: ChatCardsSlot;
	readonly asks: CardAsks;
	readonly chatId?: string | undefined;
}

export function ChatTurns({ chat, cards, asks, chatId }: ChatTurnsProps): ReactElement {
	const [openGroups] = useState(() => new Set<string>());

	if (chat.session.turns.length === 0) {
		return <NoTurns />;
	}

	const live = liveToolsOf(chat);
	return (
		<OpenGroupsContext.Provider value={openGroups}>
			<TurnRows chat={chat} cards={cards} asks={asks} live={live} />
			<LiveRow live={live} session={chat.session} chatId={chatId} />
			<EndLine chat={chat} />
		</OpenGroupsContext.Provider>
	);
}
