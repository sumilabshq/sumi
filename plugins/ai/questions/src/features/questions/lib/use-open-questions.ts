import { useOptionalQuery } from "@widgetarium/data-framework";
import { questions } from "@widgetarium/questions/contract";
import type { Question } from "@widgetarium/questions/contract";

const NONE: readonly Question[] = [];

export function useOpenQuestions(chat: string): readonly Question[] {
	return useOptionalQuery(questions.chat.questionsOfChat, { chat }).data?.open ?? NONE;
}
