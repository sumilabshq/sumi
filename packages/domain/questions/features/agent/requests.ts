import { Repeatable, command, query, refuse } from "@widgetarium/core/requests";
import { QuestionsGateway } from "../../gateways/questions/questions.gateway.js";
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
import { ChatQuestionsQuery } from "../dock/requests.js";

export const PostQuestionsCommand = command("post-questions")
	.input(PostQuestionsAskSchema)
	.output(PostedSchema)
	.idempotencyKey(Repeatable)
	.inject({ questions: QuestionsGateway })
	.handle((ask, { questions, invalidate }) => {
		const changed = questions.changeQuestions(
			ask.chat,
			(held) => questionsPosted(held, ask, Date.now()),
			`post ${ask.questions.length} ${ask.need}`,
		);
		invalidate(ChatQuestionsQuery);

		if (!changed.ok) {
			return refuse(changed.refusal);
		}

		return {
			ids: changed.held.slice(-ask.questions.length).map(({ id }) => id),
		};
	});

export const QuestionsQuery = query("questions")
	.input(QuestionsAskSchema)
	.output(QuestionSchema.array())
	.settlesNow()
	.inject({ questions: QuestionsGateway })
	.handle(({ chat, ids }, { questions }) => questions.questionsOf(chat).filter(({ id }) => ids.includes(id)));

export const IsWaitingOnPersonQuery = query("is-waiting-on-person")
	.input(ChatQuestionsAskSchema)
	.output(WaitingSchema)
	.settlesNow()
	.inject({ questions: QuestionsGateway })
	.handle(({ chat }, { questions }) => ({
		isWaiting: questions.questionsOf(chat).some(({ need, state }) => need === "needed" && state === "open"),
	}));

export const DeliverQuestionsCommand = command("deliver-questions")
	.input(DeliverQuestionsAskSchema)
	.output(DeliveredSchema)
	.idempotencyKey(Repeatable)
	.inject({ questions: QuestionsGateway })
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
		invalidate(ChatQuestionsQuery);

		if (!changed.ok) {
			return refuse(changed.refusal);
		}

		return {
			questions: [...taken.delivered],
			text: answersText(taken.delivered),
		};
	});

export const WithdrawNeededCommand = command("withdraw-needed")
	.input(ChatQuestionsAskSchema)
	.output(ChangedCountSchema)
	.idempotencyKey(Repeatable)
	.inject({ questions: QuestionsGateway })
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
		invalidate(ChatQuestionsQuery);
		return changed.ok ? { changed: counted.open } : refuse(changed.refusal);
	});
