import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Report } from "@sumi/chat-plugin";
import { useAnswersQuestion } from "../../lib/use-answers-question.js";
import { useOpenQuestions } from "../../lib/use-open-questions.js";
import { QuestionsBlock } from "./questions-block.js";

export function OpenQuestions({
	chatId,
	report,
}: {
	readonly chatId: string;
	readonly report: Report;
}): ReactElement | null {
	const open = useOpenQuestions(chatId);
	const answer = useAnswersQuestion(chatId, report);
	return <QuestionsBlock questions={open} answer={answer} />;
}
