import { createElement as h } from "react";
import type { ReactElement } from "react";
import { useQuery } from "@widgetarium/data-framework";
import { questions } from "@widgetarium/questions/contract";
import type { Report } from "@sumi/chat-plugin";
import { useQuestionDoing } from "../../lib/use-question-doing.js";
import { useQueuesAnswers } from "../../lib/use-queues-answers.js";
import { QuestionsBlock } from "./questions-block.js";

export function QuestionsDock({
	chatId,
	report,
}: {
	readonly chatId: string;
	readonly report: Report;
}): ReactElement | null {
	const { data } = useQuery(questions.dock.questionsOfChat, { chat: chatId });
	const doing = useQuestionDoing(chatId, report);
	useQueuesAnswers(chatId, data.optional, report);

	const open = [...data.needed, ...data.optional.filter(({ state }) => state === "open")];

	if (open.length === 0) {
		return null;
	}

	return (
		<div className="wg-questions-dock">
			<QuestionsBlock questions={open} doing={doing} />
		</div>
	);
}
