import { createElement as h } from "react";
import type { ReactElement } from "react";
import type { Question } from "@widgetarium/questions/contract";
import type { QuestionDoing } from "../../lib/use-question-doing.js";
import { QuestionCard } from "./question-card.js";
import { QuestionFace } from "./question-face.js";

const WAITING = "Sumi is waiting for you";
const PLACE = "1 of {count}";
const NEXT = "next";

export function QuestionsBlock({
	questions,
	doing,
}: {
	readonly questions: readonly Question[];
	readonly doing: QuestionDoing;
}): ReactElement | null {
	const [current, ...waiting] = questions;

	if (current === undefined) {
		return null;
	}

	return (
		<section className="wg-questions-block" aria-label={WAITING}>
			<header className="wg-questions-block-head">
				<QuestionFace />
				<b>{WAITING}</b>
				<span className="wg-questions-place">{PLACE.replace("{count}", String(questions.length))}</span>
			</header>
			<QuestionCard key={current.id} question={current} doing={doing} />
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
