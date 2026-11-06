import { createElement as h, useContext, useEffect } from "react";
import type { ReactElement, ReactNode } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { NameChatPaneCommand } from "@widgetarium/app-host";
import { PaneTreeQuery } from "@widgetarium/layout";
import { ChatToOpenQuery } from "@widgetarium/workspaces";
import { PaneCloseContext } from "../features/panes/lib/pane-close-context.js";
import { Plate } from "../features/plate/ui/plate/plate.js";
import { ChatPage } from "./chat-page.js";

export interface ChatPlateProps {
	readonly chatId: string | null;
	readonly crumb: ReactNode;
	readonly more: ReactNode;
}

const CHAT_LABEL = "Chat";

export function ChatPlate({ chatId, crumb, more }: ChatPlateProps): ReactElement {
	useNamesUnnamedPane(chatId);
	return (
		<Plate side="chat" label={CHAT_LABEL} edgeStart={null} lead={null} crumb={crumb} more={more} edgeEnd={null}>
			{chatId === null ? null : <ChatPage chatId={chatId} />}
		</Plate>
	);
}

function useNamesUnnamedPane(chatId: string | null): void {
	const pane = useContext(PaneCloseContext);
	const isBoardRead = useQuery(PaneTreeQuery).data.isLoaded;
	const areChatsRead = useQuery(ChatToOpenQuery).data.isRead;
	const nameChatPane = useCommand(NameChatPaneCommand);
	const paneId = pane?.paneId ?? null;
	useEffect(() => {
		if (chatId !== null || paneId === null || !isBoardRead || !areChatsRead) {
			return;
		}

		void nameChatPane.run({ paneId }).then((answer) => {
			if (!answer.ok) {
				console.error(`[widgetarium] chat pane ${paneId} got no chat: ${answer.reason}`);
			}
		});
	}, [chatId, paneId, isBoardRead, areChatsRead, nameChatPane]);
}
