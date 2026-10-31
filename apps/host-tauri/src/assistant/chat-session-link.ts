import type { StartedApp } from "@widgetarium/core/requests";
import { focusedChatPortOf } from "@widgetarium/studio";
import { RecordChatTurnCommand } from "@widgetarium/workspaces";
import { chatTasksOver } from "./chat-tasks.js";
import type { ChatSessionLink } from "./chat-sessions.js";

export function chatSessionLinkOf(workspacesApp: StartedApp): ChatSessionLink {
	const focusedChat = focusedChatPortOf(workspacesApp);
	return {
		focusedChat,
		tasks: chatTasksOver(workspacesApp),
		onSessionChanged: (chatId, session) =>
			void workspacesApp.send(RecordChatTurnCommand, {
				chatId,
				isBusy: session.busy,
				isSeen: focusedChat.isOnScreen(chatId),
				firstAsked: session.turns.find((turn) => turn.role === "user")?.text ?? null,
			}),
	};
}
