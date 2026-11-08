import { useLayoutEffect, useRef } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host/contract";
import { layout } from "@widgetarium/layout/contract";

export function ChatFollower(): null {
	const chatId = useQuery(layout.panes.current).data.focusedChatId;
	const showTab = useCommand(appHost.tabs.show);
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
