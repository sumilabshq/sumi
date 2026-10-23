import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { ActiveChatPort } from "@widgetarium/core/engine/active-chat-port.js";
import { AppProvider, app } from "@widgetarium/core/requests";
import type { StartedApp } from "@widgetarium/core/requests";
import { ChatCrumb, ChatsColumn } from "@widgetarium/workspaces";
import { WorkspacesClientModule } from "@widgetarium/workspaces/module";
import type { WorkspacesParts } from "@widgetarium/workspaces/gateways";

export interface ChatsColumnApp {
	readonly activeChat: ActiveChatPort;
	readonly column: ReactElement;
	readonly crumb: ReactElement;
	readonly workspaces: StartedApp;
}

export function createChatsColumnApp(parts: WorkspacesParts): ChatsColumnApp {
	const started = app({ modules: [WorkspacesClientModule.with(parts)] });
	return {
		activeChat: parts.activeChat,
		column: h(AppProvider, { app: started }, h(ChatsColumn)),
		crumb: h(AppProvider, { app: started }, h(ChatCrumb)),
		workspaces: started,
	};
}
