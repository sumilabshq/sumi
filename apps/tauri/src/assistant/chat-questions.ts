import type { StartedApp } from "@widgetarium/data-framework";
import { DeliverQuestionsCommand, IsWaitingOnPersonQuery, WithdrawNeededCommand } from "@widgetarium/questions";

export interface ChatQuestions {
	answersTrailer(chatId: string): Promise<string | null>;
	isWaitingOnPerson(chatId: string): Promise<boolean>;
	turnEnded(chatId: string): Promise<void>;
}

const NOT_DELIVERED = "[questions] chat {chat}: settled answers stay for the next step ({reason})";
const NOT_READ = "[questions] chat {chat}: whether it waits on the person is unknown, so the quiet turn stops ({reason})";
const NOT_WITHDRAWN = "[questions] chat {chat}: needed questions stay open after the turn ended ({reason})";

export const NO_CHAT_QUESTIONS: ChatQuestions = {
	answersTrailer: () => Promise.resolve(null),
	isWaitingOnPerson: () => Promise.resolve(false),
	turnEnded: () => Promise.resolve(),
};

export function chatQuestionsOver(app: StartedApp): ChatQuestions {
	return {
		answersTrailer: (chatId) => answersTrailer(app, chatId),
		isWaitingOnPerson: (chatId) => isWaitingOnPerson(app, chatId),
		turnEnded: (chatId) => turnEnded(app, chatId),
	};
}

async function answersTrailer(app: StartedApp, chatId: string): Promise<string | null> {
	const answered = await app.send(DeliverQuestionsCommand, { chat: chatId, ids: null });

	if (!answered.ok) {
		console.warn(NOT_DELIVERED.replace("{chat}", chatId).replace("{reason}", answered.reason));
		return null;
	}

	return answered.output.text;
}

async function isWaitingOnPerson(app: StartedApp, chatId: string): Promise<boolean> {
	const answered = await app.send(IsWaitingOnPersonQuery, { chat: chatId });

	if (!answered.ok) {
		console.warn(NOT_READ.replace("{chat}", chatId).replace("{reason}", answered.reason));
		return false;
	}

	return answered.output.isWaiting;
}

async function turnEnded(app: StartedApp, chatId: string): Promise<void> {
	const answered = await app.send(WithdrawNeededCommand, { chat: chatId });

	if (!answered.ok) {
		console.warn(NOT_WITHDRAWN.replace("{chat}", chatId).replace("{reason}", answered.reason));
		return;
	}

	if (answered.output.changed > 0) {
		console.info(`[questions] chat ${chatId}: turn ended → ${answered.output.changed} needed questions withdrawn`);
	}
}
