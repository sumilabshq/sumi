import { createElement as h, useContext, useEffect, useState } from "react";
import type { ReactElement, ReactNode } from "react";
import type { AssistantPort } from "@widgetarium/core/engine/assistant-port.js";
import { useCommand, useQuery } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { NameChatPaneCommand } from "@widgetarium/app-host";
import { PaneTreeQuery } from "@widgetarium/layout";
import { ChatToOpenQuery } from "@widgetarium/workspaces";
import { PaneCloseContext } from "../features/panes/lib/pane-close-context.js";
import { Plate } from "../features/plate/ui/plate/plate.js";
import { chatCardsOver } from "../assistant/chat-cards.js";
import { ChatMarkdownContext, useMarkdownRendererOf } from "../features/assistant/lib/chat-markdown.js";
import { ChatBody } from "./chat-body.js";
import { ChatPage } from "./chat-page.js";

export interface ChatPlateProps {
	readonly chatId: string | null;
	readonly chatAppFor: (chatId: string) => StartedApp;
	readonly assistant: AssistantPort;
	readonly crumb: ReactNode;
	readonly more: ReactNode;
}

const CHAT_LABEL = "Chat";

export function ChatPlate({ chatId, chatAppFor, assistant, crumb, more }: ChatPlateProps): ReactElement {
	const [cards] = useState(() => chatCardsOver(assistant));
	const renderMarkdown = useMarkdownRendererOf(assistant);
	useNamesUnnamedPane(chatId);
	return (
		<Plate side="chat" label={CHAT_LABEL} edgeStart={null} lead={null} crumb={crumb} more={more} edgeEnd={null}>
			{chatId === null ? null : (
				<ChatMarkdownContext value={renderMarkdown}>
					<ChatPage
						chatId={chatId}
						renderBuiltIn={() => <ChatBody chatId={chatId} chatApp={chatAppFor(chatId)} cards={cards} />}
					/>
				</ChatMarkdownContext>
			)}
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
