import { createElement as h, useContext, useEffect } from "react";
import type { ReactElement, ReactNode } from "react";
import { useCommand, useQuery } from "@widgetarium/data-framework";
import { chatTabs } from "@sumi/chat-tabs/contract";
import { layout } from "@widgetarium/layout/contract";
import { workspaces } from "@widgetarium/workspaces/contract";
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
	const isBoardRead = useQuery(layout.panes.paneTree).data.isLoaded;
	const areChatsRead = useQuery(workspaces.chats.chatToOpen).data.isRead;
	const nameChatPane = useCommand(chatTabs.chatOpening.nameChatPane);
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
