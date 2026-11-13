import type { Question } from "../schema/question.schema.js";

const HEAD = "The person answered your questions in Sumi:";

function answerOf(question: Question): string {
	return [...question.picked, ...(question.own === null ? [] : [question.own])].join("; ");
}

export function answersText(questions: readonly Question[]): string | null {
	if (questions.length === 0) {
		return null;
	}

	const lines = questions.map((question) => `- ${question.question} → ${answerOf(question)}`);
	return [HEAD, ...lines].join("\n");
}
