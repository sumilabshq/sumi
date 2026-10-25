import { useEffect, useRef } from "react";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import { ShowChatInPaneCommand } from "@widgetarium/layout";
import { ActiveChatQuery } from "@widgetarium/workspaces";

export function useShowsActiveChat(): void {
	const { id } = useQuery(ActiveChatQuery).data;
	const showChat = useCommand(ShowChatInPaneCommand);
	const shownId = useRef<string | null>(null);
	useEffect(() => {
		if (shownId.current === id) {
			return;
		}

		shownId.current = id;
		void showChat.run({ chatId: id, paneId: null }).then((answer) => {
			if (!answer.ok) {
				console.error(`[widgetarium] active chat ${id} was not shown in a pane: ${answer.reason}`);
			}
		});
	}, [id, showChat]);
}
