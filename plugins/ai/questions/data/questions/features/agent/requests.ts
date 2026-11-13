import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query } from "#module";
import { answersText } from "../../shared/lib/answer-text.js";
import {
	deliverableIn,
	openIn,
	questionsDelivered,
	questionsPosted,
	withdrawAllOpen,
} from "../../shared/lib/question-moves.js";
import {
	ChangedCountSchema,
	ChatQuestionsAskSchema,
	DeliveredSchema,
	PostQuestionsAskSchema,
	PostedSchema,
	QuestionSchema,
	QuestionsAskSchema,
	WaitingSchema,
} from "../../shared/schema/question.schema.js";
import type { Question } from "../../shared/schema/question.schema.js";
import { questionsOfChat } from "../chat/requests.js";

export const post = command()
	.public()
	.input(PostQuestionsAskSchema)
	.output(PostedSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { questions, invalidate }) => {
		const changed = questions.changeQuestions(
			ask.chat,
			(held) => questionsPosted(held, ask, Date.now()),
			`post ${ask.questions.length}`,
		);
		invalidate(questionsOfChat);

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
		isWaiting: openIn(questions.questionsOf(chat)).length > 0,
	}));

export const deliver = command()
	.public()
	.input(QuestionsAskSchema)
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
			`deliver ${ask.ids.join(", ")}`,
		);
		invalidate(questionsOfChat);

		if (!changed.ok) {
			return refuse(changed.refusal);
		}

		return {
			questions: [...taken.delivered],
			text: answersText(taken.delivered),
		};
	});

export const withdrawOpen = command()
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
				counted.open = openIn(held).length;
				return withdrawAllOpen(held, chat, Date.now());
			},
			"turn ended → withdraw open",
		);
		invalidate(questionsOfChat);
		return changed.ok ? { changed: counted.open } : refuse(changed.refusal);
	});
