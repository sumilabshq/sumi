import type { Runtime } from "@widgetarium/data-framework";
import { focusedChatPortOf } from "@widgetarium/studio";
import { chatQuestionsOver } from "./chat-questions.js";
import { chatTasksOver } from "./chat-tasks.js";
import type { ChatSessionLink } from "./chat-sessions.js";
import { ChatTurnReports } from "./chat-turn-reports.js";

export function chatSessionLinkOf(workspacesApp: Runtime): ChatSessionLink {
	const focusedChat = focusedChatPortOf(workspacesApp);
	const questions = chatQuestionsOver(workspacesApp);
	const turnReports = new ChatTurnReports(workspacesApp, focusedChat, questions);
	return {
		focusedChat,
		tasks: chatTasksOver(workspacesApp),
		questions,
		onSessionChanged: (chatId, session) => turnReports.sessionChanged(chatId, session),
	};
}
