import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { questionsChanged } from "../../gateways/questions/questions.events.js";
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

export const chatQuestions = query()
	.public()
	.input(ChatQuestionsAskSchema)
	.output(ChatQuestionsSchema)
	.settlesNow()
	.handle(({ chat }, { questions }) => dockOf(questions.questionsOf(chat)));

export const answerQuestion = command()
	.public()
	.input(AnswerQuestionAskSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { questions, invalidate }) => {
		const changed = questions.changeQuestions(
			ask.chat,
			(held) => questionAnswered(held, ask, Date.now()),
			`answer ${ask.id}`,
		);
		invalidate(chatQuestions);
		return changed.ok ? undefined : refuse(changed.refusal);
	});

export const skipQuestions = command()
	.public()
	.input(QuestionsAskSchema)
	.output(ChangedCountSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { questions, invalidate }) => {
		const changed = questions.changeQuestions(
			ask.chat,
			(held) => questionsSkipped(held, ask, Date.now()),
			`skip ${ask.ids.join(", ")}`,
		);
		invalidate(chatQuestions);
		return changed.ok ? { changed: ask.ids.length } : refuse(changed.refusal);
	});

export const reopenQuestion = command()
	.public()
	.input(QuestionAskSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { questions, invalidate }) => {
		const changed = questions.changeQuestions(ask.chat, (held) => questionReopened(held, ask), `undo ${ask.id}`);
		invalidate(chatQuestions);
		return changed.ok ? undefined : refuse(changed.refusal);
	});

export const readyAnswers = query()
	.public()
	.input(ChatQuestionsAskSchema)
	.output(DeliveredSchema)
	.settlesNow()
	.handle(({ chat }, { questions }) => {
		const ready = answersReadyIn(questions.questionsOf(chat), chat);
		return {
			questions: [...ready],
			text: answersText(ready),
		};
	});

export const rereadQuestions = subscriber(questionsChanged).handle((_input, { invalidate }) => {
	invalidate(chatQuestions);
});

function dockOf(held: readonly Question[]): ChatQuestions {
	return {
		needed: held.filter(({ need, state }) => need === "needed" && state === "open"),
		optional: held.filter(
			({ need, state, isDelivered }) => need === "optional" && state !== "withdrawn" && !isDelivered,
		),
	};
}
