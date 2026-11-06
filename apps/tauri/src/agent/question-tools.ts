import { z } from "zod";
import {
	AskedQuestionSchema,
	DeliverQuestionsCommand,
	PostQuestionsCommand,
	QuestionsQuery,
} from "@widgetarium/questions";
import type { QuestionNeed } from "@widgetarium/questions";
import { fieldsOf, inputOf, outputOf } from "./tool-places.js";
import type { ToolContext } from "./tool-places.js";

const QuestionsInputSchema = z.object({
	questions: z.array(AskedQuestionSchema).min(1),
});

const POLL_MS = 500;

const NOT_ANSWERED = "The turn ended before the person answered, so these questions were withdrawn.";
const OPTIONAL_POSTED =
	"Asked. Keep working on your defaults: answers arrive between your steps or with the person's next message; a skipped question means you do what its skipSays said.";

export async function askNeeded(context: ToolContext, input: unknown) {
	const ids = await posted(context, { tool: "ask_needed", need: "needed", input });
	await settledOf(context, ids);
	const delivered = await outputOf(
		context.app.send(DeliverQuestionsCommand, {
			chat: context.chatId,
			ids: [...ids],
		}),
	);
	return {
		answers: delivered.questions.map(({ question, state, picked, own, skipSays }) => ({
			question,
			picked,
			own,
			...(state === "skipped" ? { skipped: skipSays } : {}),
		})),
	};
}

export async function askOptional(context: ToolContext, input: unknown) {
	const ids = await posted(context, { tool: "ask_optional", need: "optional", input });
	return {
		ids,
		said: OPTIONAL_POSTED,
	};
}

// TODO: rename questions_settled → queue_between_steps, needs the Rust hook rebuilt
export function questionsSettled({ chatId, queue }: ToolContext) {
	return Promise.resolve({
		text: queue.handQueueToAgent(chatId) ?? "",
	});
}

async function posted(
	{ app, chatId }: ToolContext,
	{ tool, need, input }: { readonly tool: string; readonly need: QuestionNeed; readonly input: unknown },
): Promise<readonly string[]> {
	const asked = inputOf(QuestionsInputSchema, tool, fieldsOf(tool, input));
	const answer = await outputOf(
		app.send(PostQuestionsCommand, {
			chat: chatId,
			need,
			questions: asked.questions,
		}),
	);
	return answer.ids;
}

// TRADE-OFF: the call polls the core every half second; a watch over QuestionsChangedEvent would answer at once
async function settledOf({ app, chatId }: ToolContext, ids: readonly string[]): Promise<void> {
	for (;;) {
		const held = await outputOf(app.send(QuestionsQuery, { chat: chatId, ids: [...ids] }));

		if (held.some(({ state }) => state === "withdrawn")) {
			throw new Error(NOT_ANSWERED);
		}

		if (held.every(({ state }) => state !== "open")) {
			return;
		}

		await new Promise((resolve) => setTimeout(resolve, POLL_MS));
	}
}
