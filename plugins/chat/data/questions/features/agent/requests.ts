import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query } from "#module";
import { answersText } from "../../shared/lib/answer-text.js";
import {
	deliverableIn,
	neededWithdrawn,
	questionsDelivered,
	questionsPosted,
} from "../../shared/lib/question-moves.js";
import {
	ChangedCountSchema,
	ChatQuestionsAskSchema,
	DeliverQuestionsAskSchema,
	DeliveredSchema,
	PostQuestionsAskSchema,
	PostedSchema,
	QuestionSchema,
	QuestionsAskSchema,
	WaitingSchema,
} from "../../shared/schema/question.schema.js";
import type { Question } from "../../shared/schema/question.schema.js";
import { ofChat } from "../dock/requests.js";

export const post = command()
	.public()
	.input(PostQuestionsAskSchema)
	.output(PostedSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { questions, invalidate }) => {
		const changed = questions.changeQuestions(
			ask.chat,
			(held) => questionsPosted(held, ask, Date.now()),
			`post ${ask.questions.length} ${ask.need}`,
		);
		invalidate(ofChat);

		if (!changed.ok) {
			return refuse(changed.refusal);
		}

		return {
			ids: changed.held.slice(-ask.questions.length).map(({ id }) => id),
		};
	});

export const all = query()
	.public()
	.input(QuestionsAskSchema)
	.output(QuestionSchema.array())
	.settlesNow()
	.handle(({ chat, ids }, { questions }) => questions.questionsOf(chat).filter(({ id }) => ids.includes(id)));

export const isWaitingOnPerson = query()
	.public()
	.input(ChatQuestionsAskSchema)
	.output(WaitingSchema)
	.settlesNow()
	.handle(({ chat }, { questions }) => ({
		isWaiting: questions.questionsOf(chat).some(({ need, state }) => need === "needed" && state === "open"),
	}));

export const deliver = command()
	.public()
	.input(DeliverQuestionsAskSchema)
	.output(DeliveredSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { questions, invalidate }) => {
		const taken: { delivered: readonly Question[] } = {
			delivered: [],
		};
		const changed = questions.changeQuestions(
			ask.chat,
			(held) => {
				taken.delivered = deliverableIn(held, ask);
				return questionsDelivered(held, taken.delivered);
			},
			ask.ids === null ? "deliver settled optional" : `deliver ${ask.ids.join(", ")}`,
		);
		invalidate(ofChat);

		if (!changed.ok) {
			return refuse(changed.refusal);
		}

		return {
			questions: [...taken.delivered],
			text: answersText(taken.delivered),
		};
	});

export const withdrawNeeded = command()
	.public()
	.input(ChatQuestionsAskSchema)
	.output(ChangedCountSchema)
	.idempotencyKey(Repeatable)
	.handle(({ chat }, { questions, invalidate }) => {
		const counted = {
			open: 0,
		};
		const changed = questions.changeQuestions(
			chat,
			(held) => {
				counted.open = held.filter(({ need, state }) => need === "needed" && state === "open").length;
				return neededWithdrawn(held, chat, Date.now());
			},
			"turn ended → withdraw needed",
		);
		invalidate(ofChat);
		return changed.ok ? { changed: counted.open } : refuse(changed.refusal);
	});
