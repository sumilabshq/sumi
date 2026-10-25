import { useEffect } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { studioWindowOf } from "@widgetarium/behaviors";
import { OpenChatAskedOnStartCommand } from "@widgetarium/app-host";
import { PaneTreeQuery } from "@widgetarium/layout";
import { ChatToOpenQuery } from "@widgetarium/workspaces";
import { hasUnnamedChatPane } from "./unnamed-chat-pane.js";

export function useOpensChatAskedOnStart(): void {
	const asked = useQuery(ChatToOpenQuery).data;
	const board = useQuery(PaneTreeQuery).data;
	const openChatAskedOnStart = useCommand(OpenChatAskedOnStartCommand);
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
