import { Repeatable, command, query, refuse, subscriber } from "@widgetarium/framework";
import { QuestionsChangedEvent } from "../../gateways/questions/questions.events.js";
import { QuestionsGateway } from "../../gateways/questions/questions.gateway.js";
import { answersText } from "../../shared/lib/answer-text.js";
import {
	answersReadyIn,
	questionAnswered,
	questionReopened,
	questionsSkipped,
} from "../../shared/lib/question-moves.js";
import {
	AnswerQuestionAskSchema,
	ChangedCountSchema,
	ChatQuestionsAskSchema,
	ChatQuestionsSchema,
	DeliveredSchema,
	QuestionAskSchema,
	QuestionsAskSchema,
} from "../../shared/schema/question.schema.js";
import type { ChatQuestions, Question } from "../../shared/schema/question.schema.js";

export const ChatQuestionsQuery = query("chat-questions")
	.input(ChatQuestionsAskSchema)
	.output(ChatQuestionsSchema)
	.settlesNow()
	.inject({ questions: QuestionsGateway })
	.handle(({ chat }, { questions }) => dockOf(questions.questionsOf(chat)));

export const AnswerQuestionCommand = command("answer-question")
	.input(AnswerQuestionAskSchema)
	.idempotencyKey(Repeatable)
	.inject({ questions: QuestionsGateway })
	.handle((ask, { questions, invalidate }) => {
		const changed = questions.changeQuestions(ask.chat, (held) => questionAnswered(held, ask, Date.now()), `answer ${ask.id}`);
		invalidate(ChatQuestionsQuery);
		return changed.ok ? undefined : refuse(changed.refusal);
	});

export const SkipQuestionsCommand = command("skip-questions")
	.input(QuestionsAskSchema)
	.output(ChangedCountSchema)
	.idempotencyKey(Repeatable)
	.inject({ questions: QuestionsGateway })
	.handle((ask, { questions, invalidate }) => {
		const changed = questions.changeQuestions(
			ask.chat,
			(held) => questionsSkipped(held, ask, Date.now()),
			`skip ${ask.ids.join(", ")}`,
		);
		invalidate(ChatQuestionsQuery);
		return changed.ok ? { changed: ask.ids.length } : refuse(changed.refusal);
	});

export const ReopenQuestionCommand = command("reopen-question")
	.input(QuestionAskSchema)
	.idempotencyKey(Repeatable)
	.inject({ questions: QuestionsGateway })
	.handle((ask, { questions, invalidate }) => {
		const changed = questions.changeQuestions(ask.chat, (held) => questionReopened(held, ask), `undo ${ask.id}`);
		invalidate(ChatQuestionsQuery);
		return changed.ok ? undefined : refuse(changed.refusal);
	});

export const ReadyAnswersQuery = query("ready-answers")
	.input(ChatQuestionsAskSchema)
	.output(DeliveredSchema)
	.settlesNow()
	.inject({ questions: QuestionsGateway })
	.handle(({ chat }, { questions }) => {
		const ready = answersReadyIn(questions.questionsOf(chat), chat);
		return {
			questions: [...ready],
			text: answersText(ready),
		};
	});

export const RereadQuestionsSubscriber = subscriber(QuestionsChangedEvent).handle((_input, { invalidate }) => {
	invalidate(ChatQuestionsQuery);
});

function dockOf(held: readonly Question[]): ChatQuestions {
	return {
		needed: held.filter(({ need, state }) => need === "needed" && state === "open"),
		optional: held.filter(({ need, state, isDelivered }) => need === "optional" && state !== "withdrawn" && !isDelivered),
	};
}
