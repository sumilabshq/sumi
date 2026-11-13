import { AuthenticatedGuard, Repeatable, refuse } from "@widgetarium/data-framework";
import type { OutputOf, Send } from "@widgetarium/data-framework";
import { questions } from "@widgetarium/questions/contract";
import { command } from "#module";
import {
	NeededAnswersSchema,
	NeededAskSchema,
	OptionalAskSchema,
	OptionalPostedSchema,
} from "../../shared/schema/ask.schema.js";
import { questionsToPost } from "./lib/questions-to-post.js";

type DeliveredQuestion = OutputOf<typeof questions.agent.deliver>["questions"][number];

interface AskedQuestions {
	readonly chat: string;
	readonly ids: string[];
}

const POLL_MS = 500;
const NOT_ANSWERED = "The turn ended before the person answered, so these questions were withdrawn.";
const OPTIONAL_POSTED =
	"Asked. Keep working on your defaults: answers arrive between your steps or with the person's next message; a skipped question means you do what its skipSays said.";

export const needed = command()
	.public()
	.metadata({
		description:
			"Ask the person questions you cannot go on without: a permission, a choice only they can make, a fact that is nowhere to read. Sumi shows them in a black block above the input that stays until answered, one at a time, and this call waits for every answer. Ask only what truly blocks you; for anything with a sensible default use ask_questions_optional. Use it instead of AskUserQuestion, which does not work here.",
	})
	.input(NeededAskSchema)
	.output(NeededAnswersSchema)
	.idempotencyKey(Repeatable)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { user, send }) => {
		const { ids } = await send(questions.agent.post, {
			chat: user.id,
			need: "needed",
			questions: questionsToPost(asked.questions),
		});
		const isSettled = await waitUntilAllSettled(send, { chat: user.id, ids });

		if (!isSettled) {
			return refuse(NOT_ANSWERED);
		}

		const delivered = await send(questions.agent.deliver, { chat: user.id, ids });
		return { answers: delivered.questions.map(answerOf) };
	});

export const optional = command()
	.public()
	.metadata({
		description:
			"Ask the person questions that do not stop you: a preference, a side fix you noticed, a clean-up. Sumi folds them into a grey pill the person opens when they like; every one can be skipped. The call answers at once with their ids: keep working on your default. Answers arrive between your steps or with the person's next message, as a list of answers; a skipped question means you do what its skipSays said.",
	})
	.input(OptionalAskSchema)
	.output(OptionalPostedSchema)
	.idempotencyKey(Repeatable)
	.guard(AuthenticatedGuard)
	.handle(async (asked, { user, send }) => {
		const { ids } = await send(questions.agent.post, {
			chat: user.id,
			need: "optional",
			questions: questionsToPost(asked.questions),
		});
		return {
			ids,
			said: OPTIONAL_POSTED,
		};
	});

function answerOf({ question, state, picked, own, skipSays }: DeliveredQuestion) {
	return {
		question,
		picked,
		own,
		...(state === "skipped" ? { skipped: skipSays } : {}),
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
