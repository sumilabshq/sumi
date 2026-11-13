import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { questionsChanged } from "../../gateways/questions/questions.events.js";
import { openIn, questionAnswered } from "../../shared/lib/question-moves.js";
import {
	AnswerQuestionAskSchema,
	ChatQuestionsAskSchema,
	ChatQuestionsSchema,
} from "../../shared/schema/question.schema.js";

export const questionsOfChat = query()
	.public()
	.input(ChatQuestionsAskSchema)
	.output(ChatQuestionsSchema)
	.settlesNow()
	.handle(({ chat }, { questions }) => ({
		open: [...openIn(questions.questionsOf(chat))],
	}));

export const answer = command()
	.public()
	.input(AnswerQuestionAskSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { questions, invalidate }) => {
		const changed = questions.changeQuestions(
			ask.chat,
			(held) => questionAnswered(held, ask, Date.now()),
			`answer ${ask.id}`,
		);
		invalidate(questionsOfChat);
		return changed.ok ? undefined : refuse(changed.refusal);
	});

export const reread = subscriber(questionsChanged).handle((_input, { invalidate }) => {
	invalidate(questionsOfChat);
});
