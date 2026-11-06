import { useLayoutEffect, useRef } from "react";
import { useCommand, useQuery } from "@widgetarium/framework";
import { ShowChatTabCommand } from "@widgetarium/app-host";
import { PaneTreeQuery } from "@widgetarium/layout";

export function ChatFollower(): null {
	const chatId = useQuery(PaneTreeQuery).data.focusedChatId;
	const showChatTab = useCommand(ShowChatTabCommand);
	const followedId = useRef<string | null>(null);
	useLayoutEffect(() => {
		if (followedId.current === chatId) {
			return;
		}

		followedId.current = chatId;

		if (chatId !== null) {
			void showChatTab.run({ chatId });
		}
	}, [chatId, showChatTab]);
	return null;
}
