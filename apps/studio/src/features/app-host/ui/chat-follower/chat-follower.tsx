import { useLayoutEffect, useRef } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { appHost } from "@widgetarium/app-host";
import { layout } from "@widgetarium/layout";

export function ChatFollower(): null {
	const chatId = useQuery(layout.panes.paneTree).data.focusedChatId;
	const showTab = useCommand(appHost.tabs.showTab);
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
