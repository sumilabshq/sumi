import { useLayoutEffect, useRef } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { ShowChatTabCommand, TabsSidebarQuery } from "../../contract.js";

export function ChatFollower(): null {
	const chatId = useQuery(TabsSidebarQuery).data.chat.id;
	const showChatTab = useCommand(ShowChatTabCommand);
	const followedId = useRef(chatId);
	useLayoutEffect(() => {
		if (followedId.current === chatId) {
			return;
		}

		followedId.current = chatId;
		void showChatTab.run();
	}, [chatId, showChatTab]);
	return null;
}
