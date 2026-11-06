import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { FocusedChatPort } from "@widgetarium/core/engine/focused-chat-port.js";
import { AppProvider } from "@widgetarium/data-framework";
import type { StartedApp } from "@widgetarium/data-framework";
import { ChatRenaming } from "../features/workspaces/lib/chat-renaming.js";
import { ChatCrumb } from "../features/workspaces/ui/chat-crumb/chat-crumb.js";
import { ChatMore } from "../features/workspaces/ui/chat-more/chat-more.js";
import { ChatsColumn } from "../features/workspaces/ui/chats-column/chats-column.js";
import { focusedChatPortOf } from "./focused-chat.js";

export interface ChatsColumnApp {
	readonly focusedChat: FocusedChatPort;
	readonly column: ReactElement;
	readonly crumbOf: (chatId: string | null) => ReactElement;
	readonly moreOf: (chatId: string | null) => ReactElement;
	readonly workspaces: StartedApp;
}

export function createChatsColumnApp(workspacesApp: StartedApp): ChatsColumnApp {
	const renaming = new ChatRenaming();
	return {
		focusedChat: focusedChatPortOf(workspacesApp),
		column: h(AppProvider, { app: workspacesApp }, h(ChatsColumn)),
		crumbOf: (chatId) => h(AppProvider, { app: workspacesApp }, h(ChatCrumb, { renaming, chatId })),
		moreOf: (chatId) => h(AppProvider, { app: workspacesApp }, h(ChatMore, { renaming, chatId })),
		workspaces: workspacesApp,
	};
}
