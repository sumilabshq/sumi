import { useEffect, useRef } from "react";
import { useRuntime, useCommand } from "@widgetarium/data-framework";
import type { Runtime } from "@widgetarium/data-framework";
import { DeliverQuestionsCommand, ReadyAnswersQuery } from "@sumi/contract";
import type { Question } from "@sumi/contract";
import { SendTextCommand } from "@widgetarium/assistant";
import type { Report } from "../../../shared/lib/failure-line.js";

const NOT_QUEUED = "the answers did not reach the queue";
const QUEUED_NOT_MARKED =
	"[questions] chat {chat}: the answers are queued but still unmarked, so they may also ride the next message";

interface AnswerSteps {
	readonly app: Runtime;
	readonly sendText: ReturnType<typeof useCommand<typeof SendTextCommand>>;
	readonly deliver: ReturnType<typeof useCommand<typeof DeliverQuestionsCommand>>;
}

export function useQueuesAnswers(chatId: string, optionalQuestions: readonly Question[], report: Report): void {
	const steps: AnswerSteps = {
		app: useRuntime("useQueuesAnswers"),
		sendText: useCommand(SendTextCommand),
		deliver: useCommand(DeliverQuestionsCommand),
	};
	const latest = useRef({ steps, report });
	latest.current = { steps, report };
	const isAllAnswered = optionalQuestions.length > 0 && optionalQuestions.every(({ state }) => state !== "open");
	const answeredKey = isAllAnswered ? optionalQuestions.map(({ id }) => id).join(",") : null;
	useEffect(() => {
		if (answeredKey === null) {
			return;
		}

		void latest.current.report(queueAnswers(chatId, latest.current.steps), NOT_QUEUED);
	}, [chatId, answeredKey]);
}

async function queueAnswers(chatId: string, { app, sendText, deliver }: AnswerSteps): Promise<void> {
	const ready = outputOf(await app.send(ReadyAnswersQuery, { chat: chatId }));

	if (ready.text === null) {
		console.debug(`[questions] chat ${chatId}: every optional ask answered → nothing ready to queue`);
		return;
	}

	outputOf(await sendText.run({ chat: chatId, said: ready.text }));
	const delivered = await deliver.run({ chat: chatId, ids: ready.questions.map(({ id }) => id) });

	if (!delivered.ok) {
		console.error(QUEUED_NOT_MARKED.replace("{chat}", chatId), delivered.reason);
		throw new Error(delivered.reason);
	}

	console.info(`[questions] chat ${chatId}: ${ready.questions.length} answers → one queued message → marked handed`);
}

function outputOf<T>(answer: { readonly ok: true; readonly output: T } | { readonly ok: false; readonly reason: string }): T {
	if (!answer.ok) {
		throw new Error(answer.reason);
	}

	return answer.output;
}
