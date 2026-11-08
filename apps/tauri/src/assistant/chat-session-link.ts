import type { Runtime } from "@widgetarium/data-framework";
import { focusedChatPortOf } from "@widgetarium/studio";
import { workspaces } from "@widgetarium/workspaces/contract";
import { chatQuestionsOver } from "./chat-questions.js";
import { chatTasksOver } from "./chat-tasks.js";
import type { ChatSessionLink } from "./chat-sessions.js";

export function chatSessionLinkOf(workspacesApp: Runtime): ChatSessionLink {
	const focusedChat = focusedChatPortOf(workspacesApp);
	return {
		focusedChat,
		tasks: chatTasksOver(workspacesApp),
		questions: chatQuestionsOver(workspacesApp),
		onSessionChanged: (chatId, session) =>
			void workspacesApp.send(workspaces.chats.recordTurn, {
				chatId,
				isBusy: session.busy,
				isSeen: focusedChat.isOnScreen(chatId),
				firstAsked: session.turns.find((turn) => turn.role === "user")?.text ?? null,
			}),
	};
}
