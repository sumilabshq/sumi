import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Question } from "@widgetarium/questions/contract";
import { Mascot } from "@sumi/chat-plugin";
import type { AnswerQuestion } from "../../lib/use-answers-question.js";
import { QuestionCard } from "./question-card.js";

const WAITING = "Sumi is waiting for you";
const PLACE = "1 of {count}";
const NEXT = "next";
const MASCOT_PX = 20;

export function QuestionsBlock({
	questions,
	answer,
}: {
	readonly questions: readonly Question[];
	readonly answer: AnswerQuestion;
}): ReactElement | null {
	const [current, ...waiting] = questions;

	if (current === undefined) {
		return null;
	}

	return (
		<section className="wg-questions-block" aria-label={WAITING}>
			<header className="wg-questions-block-head">
				<Mascot size={MASCOT_PX} />
				<b>{WAITING}</b>
				<span className="wg-questions-place">{PLACE.replace("{count}", String(questions.length))}</span>
			</header>
			<QuestionCard key={current.id} question={current} answer={answer} />
			{waiting.map((question, at) => (
				<div key={question.id} className="wg-questions-next">
					<span className="wg-questions-next-num">{at + 2}</span>
					<span className="wg-questions-next-text">{question.question}</span>
					<span>{NEXT}</span>
				</div>
			))}
		</section>
	);
}
