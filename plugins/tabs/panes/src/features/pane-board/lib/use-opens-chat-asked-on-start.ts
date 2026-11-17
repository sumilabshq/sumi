import { appHost } from "@widgetarium/app-host/contract";
import { useEffect } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { studioWindowOf } from "@widgetarium/behaviors";
import { chatTabs } from "@sumi/chat-tabs/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
import { hasUnnamedChatPane } from "./unnamed-chat-pane.js";

export function useOpensChatAskedOnStart(): void {
	const asked = useQuery(workspaces.chats.chatToOpen).data;
	const board = useQuery(appHost.panes.paneTree).data;
	const openChatAskedOnStart = useCommand(chatTabs.chatOpening.openAskedOnStart);
	const isWaiting = !board.isLoaded || !asked.isRead || hasUnnamedChatPane(board);
	useEffect(() => {
		if (asked.id === null || isWaiting || !studioWindowOf(location.search).isMain) {
			return;
		}

		void openChatAskedOnStart.run().then((answer) => {
			if (!answer.ok) {
				console.error(`[widgetarium] the chat asked on start was not opened: ${answer.reason}`);
			}
		});
	}, [asked.id, isWaiting, openChatAskedOnStart]);
}
