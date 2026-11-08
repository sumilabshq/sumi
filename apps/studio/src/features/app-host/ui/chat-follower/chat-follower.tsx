import { useLayoutEffect, useRef } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { ShowTabCommand } from "@widgetarium/app-host";
import { PaneTreeQuery } from "@widgetarium/layout";

export function ChatFollower(): null {
	const chatId = useQuery(PaneTreeQuery).data.focusedChatId;
	const showTab = useCommand(ShowTabCommand);
	const followedId = useRef<string | null>(null);
	useLayoutEffect(() => {
		if (followedId.current === chatId) {
			return;
		}

		followedId.current = chatId;

		if (chatId !== null) {
			void showTab.run({ id: chatId, isFollowingFocus: true });
		}
	}, [chatId, showTab]);
	return null;
}
