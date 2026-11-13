import { AuthenticatedGuard, Repeatable, refuse } from "@widgetarium/data-framework";
import type { OutputOf, Send } from "@widgetarium/data-framework";
import { questions } from "@widgetarium/questions/contract";
import { command } from "#module";
import { PersonAnswersSchema, AskPersonSchema } from "../../shared/schema/ask.schema.js";
import { questionsToPost } from "./lib/questions-to-post.js";

type DeliveredQuestion = OutputOf<typeof questions.agent.deliver>["questions"][number];

interface AskedQuestions {
	readonly chat: string;
	readonly ids: string[];
}

const POLL_MS = 500;
const NOT_ANSWERED = "The turn ended before the person answered, so these questions were withdrawn.";

export const askPerson = command()
	.public()
	.metadata({
		description:
			"Ask the person questions you cannot go on without: a permission, a choice only they can make, a fact that is nowhere to read. Sumi shows them in a grey block in the chat that stays until answered, one at a time, and this call waits for every answer. Ask only what truly blocks you. Use it instead of AskUserQuestion, which does not work here.",
	})
	.input(AskPersonSchema)
	.output(PersonAnswersSchema)
	.idempotencyKey(Repeatable)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { user, send }) => {
		const { ids } = await send(questions.agent.post, {
			chat: user.id,
			questions: questionsToPost(asked.questions),
		});
		const isSettled = await waitUntilAllSettled(send, { chat: user.id, ids });

		if (!isSettled) {
			return refuse(NOT_ANSWERED);
		}

		const delivered = await send(questions.agent.deliver, { chat: user.id, ids });
		return { answers: delivered.questions.map(answerOf) };
	});

function answerOf({ question, picked, own }: DeliveredQuestion) {
	return {
		question,
		picked,
		own,
	};
}

// TRADE-OFF: polls every half second; a watch over questions-of-chat would answer at once
async function waitUntilAllSettled(send: Send, asked: AskedQuestions): Promise<boolean> {
	for (;;) {
		const held = await send(questions.agent.all, asked);

		if (held.some(({ state }) => state === "withdrawn")) {
			return false;
		}

		if (held.every(({ state }) => state !== "open")) {
			return true;
		}

		await new Promise((resolve) => setTimeout(resolve, POLL_MS));
	}
}
