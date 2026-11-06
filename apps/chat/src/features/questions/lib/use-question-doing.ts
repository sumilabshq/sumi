import { useCommand } from "@widgetarium/data-framework";
import { AnswerQuestionCommand, ReopenQuestionCommand, SkipQuestionsCommand } from "@sumi/contract";
import { answerSettled } from "../../assistant/lib/answer-settled.js";
import type { Report } from "../../assistant/lib/failure-line.js";

export interface QuestionDoing {
	answer(id: string, picked: readonly string[], own: string | null): void;
	skip(ids: readonly string[]): void;
	reopen(id: string): void;
}

const NOT_ANSWERED = "the answer was not saved";
const NOT_SKIPPED = "the question was not skipped";
const NOT_REOPENED = "the answer was not undone";

export function useQuestionDoing(chat: string, report: Report): QuestionDoing {
	const answer = useCommand(AnswerQuestionCommand);
	const skip = useCommand(SkipQuestionsCommand);
	const reopen = useCommand(ReopenQuestionCommand);
	return {
		answer: (id, picked, own) =>
			void report(answerSettled(answer.run({ chat, id, picked: [...picked], own })), NOT_ANSWERED),
		skip: (ids) => void report(answerSettled(skip.run({ chat, ids: [...ids] })), NOT_SKIPPED),
		reopen: (id) => void report(answerSettled(reopen.run({ chat, id })), NOT_REOPENED),
	};
}
