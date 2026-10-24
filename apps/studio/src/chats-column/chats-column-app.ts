import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ActiveChatPort } from "@widgetarium/core/engine/active-chat-port.js";
import { AppProvider } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { ChatCrumb } from "../features/workspaces/ui/chat-crumb/chat-crumb.js";
import { ChatsColumn } from "../features/workspaces/ui/chats-column/chats-column.js";
import { activeChatPortOf } from "./workspaces-active-chat.js";

export interface ChatsColumnApp {
	readonly activeChat: ActiveChatPort;
	readonly column: ReactElement;
	readonly crumb: ReactElement;
	readonly workspaces: StartedApp;
}

export function createChatsColumnApp(workspacesApp: StartedApp): ChatsColumnApp {
	return {
		activeChat: activeChatPortOf(workspacesApp),
		column: h(AppProvider, { app: workspacesApp }, h(ChatsColumn)),
		crumb: h(AppProvider, { app: workspacesApp }, h(ChatCrumb)),
		workspaces: workspacesApp,
	};
}
