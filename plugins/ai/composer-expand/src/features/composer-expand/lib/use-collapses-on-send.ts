import { useEffect, useRef } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { assistant } from "@widgetarium/assistant/contract";

export function useCollapsesOnSend(chatId: string | null, collapse: () => void): void {
	const { data: chat } = useQuery(assistant.chat.one, { chat: chatId });
	const sentCount = chat.session.turns.length + chat.queued.length;
	const lastSentCount = useRef(sentCount);
	useEffect(() => {
		if (sentCount > lastSentCount.current) {
			collapse();
		}

		lastSentCount.current = sentCount;
	}, [sentCount, collapse]);
}
