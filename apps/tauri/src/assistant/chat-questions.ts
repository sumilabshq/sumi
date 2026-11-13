import type { Runtime } from "@widgetarium/data-framework";
import { questions } from "@widgetarium/questions/contract";

export interface ChatQuestions {
	isWaitingOnPerson(chatId: string): Promise<boolean>;
	turnEnded(chatId: string): Promise<void>;
}

const NOT_READ =
	"[questions] chat {chat}: whether it waits on the person is unknown, so the quiet turn stops ({reason})";
const NOT_WITHDRAWN = "[questions] chat {chat}: questions stay open after the turn ended ({reason})";

export const NO_CHAT_QUESTIONS: ChatQuestions = {
	isWaitingOnPerson: () => Promise.resolve(false),
	turnEnded: () => Promise.resolve(),
};

export function chatQuestionsOver(app: Runtime): ChatQuestions {
	return {
		isWaitingOnPerson: (chatId) => isWaitingOnPerson(app, chatId),
		turnEnded: (chatId) => turnEnded(app, chatId),
	};
}

async function isWaitingOnPerson(app: Runtime, chatId: string): Promise<boolean> {
	const answered = await app.send(questions.agent.isWaitingOnPerson, { chat: chatId });

	if (!answered.ok) {
		console.warn(NOT_READ.replace("{chat}", chatId).replace("{reason}", answered.reason));
		return false;
	}

	return answered.output.isWaiting;
}

async function turnEnded(app: Runtime, chatId: string): Promise<void> {
	const answered = await app.send(questions.agent.withdrawOpen, { chat: chatId });

	if (!answered.ok) {
		console.warn(NOT_WITHDRAWN.replace("{chat}", chatId).replace("{reason}", answered.reason));
		return;
	}

	if (answered.output.changed > 0) {
		console.info(`[questions] chat ${chatId}: turn ended → ${answered.output.changed} questions withdrawn`);
	}
}
