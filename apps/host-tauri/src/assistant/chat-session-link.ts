import type { StartedApp } from "@widgetarium/core/requests";
import { activeChatPortOf } from "@widgetarium/studio";
import { RecordChatTurnCommand } from "@widgetarium/workspaces";
import type { ChatSessionLink } from "./chat-sessions.js";

export function chatSessionLinkOf(workspacesApp: StartedApp): ChatSessionLink {
	return {
		activeChat: activeChatPortOf(workspacesApp),
		onSessionChanged: (chatId, session) =>
			void workspacesApp.send(RecordChatTurnCommand, {
				chatId,
				isBusy: session.busy,
				firstAsked: session.turns.find((turn) => turn.role === "user")?.text ?? null,
			}),
	};
}
