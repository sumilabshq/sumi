import { useCommand } from "@widgetarium/data-framework";
import { questions } from "@widgetarium/questions/contract";
import { answerSettled } from "@sumi/chat-plugin";
import type { Report } from "@sumi/chat-plugin";

export type AnswerQuestion = (id: string, picked: readonly string[], own: string | null) => void;

const NOT_ANSWERED = "the answer was not saved";

export function useAnswersQuestion(chat: string, report: Report): AnswerQuestion {
	const answer = useCommand(questions.chat.answer);
	return (id, picked, own) =>
		void report(answerSettled(answer.run({ chat, id, picked: [...picked], own })), NOT_ANSWERED);
}
