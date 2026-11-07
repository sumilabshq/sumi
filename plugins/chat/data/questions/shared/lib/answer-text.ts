import type { Question } from "../schema/question.schema.js";

const HEAD = "The person answered your questions in Sumi:";
const SKIPPED = "skipped, so you do what you said: {skipSays}";
const WITHDRAWN = "not answered: the turn ended first";

export function answerOf(question: Question): string {
	if (question.state === "skipped") {
		return SKIPPED.replace("{skipSays}", question.skipSays);
	}

	if (question.state === "withdrawn") {
		return WITHDRAWN;
	}

	return [...question.picked, ...(question.own === null ? [] : [question.own])].join("; ");
}

export function answersText(questions: readonly Question[]): string | null {
	if (questions.length === 0) {
		return null;
	}

	const lines = questions.map((question) => `- ${question.question} → ${answerOf(question)}`);
	return [HEAD, ...lines].join("\n");
}
