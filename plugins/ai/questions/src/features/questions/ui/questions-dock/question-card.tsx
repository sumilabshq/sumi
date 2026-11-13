import { createElement as h, useState } from "react";
import type { FormEvent, KeyboardEvent, ReactElement } from "react";
import type { Question } from "@widgetarium/questions/contract";
import type { QuestionDoing } from "../../lib/use-question-doing.js";

export interface QuestionCardProps {
	readonly question: Question;
	readonly doing: QuestionDoing;
}

const ANSWER = "Answer";
const OWN_PLACEHOLDER = "Or answer in your own words";
const SEND_HINT = "↵ send";

export function QuestionCard({ question, doing }: QuestionCardProps): ReactElement {
	const [picked, setPicked] = useState<readonly string[]>([]);
	const [own, setOwn] = useState("");
	const press = (label: string): void => {
		if (!question.multiple) {
			doing.answer(question.id, [label], null);
			return;
		}

		setPicked(picked.includes(label) ? picked.filter((each) => each !== label) : [...picked, label]);
	};
	const sendOwn = (event: FormEvent): void => {
		event.preventDefault();
		const said = own.trim();

		if (said === "" && picked.length === 0) {
			return;
		}

		doing.answer(question.id, picked, said === "" ? null : said);
	};
	const pressByNumber = (event: KeyboardEvent<HTMLInputElement>): void => {
		const option = own === "" ? question.options[Number(event.key) - 1] : undefined;

		if (option === undefined) {
			return;
		}

		event.preventDefault();
		press(option.label);
	};
	return (
		<div className="wg-questions-card">
			<p className="wg-questions-card-question">{question.question}</p>
			{question.detail === "" ? null : <p className="wg-questions-card-detail">{question.detail}</p>}
			{question.options.map((option, at) => (
				<button
					key={option.label}
					type="button"
					aria-pressed={question.multiple ? picked.includes(option.label) : undefined}
					className="wg-questions-option"
					onClick={() => press(option.label)}
				>
					<span className="wg-questions-option-num">{at + 1}</span>
					<span className="wg-questions-option-label">{option.label}</span>
					{option.detail === "" ? null : <span className="wg-questions-option-detail">{option.detail}</span>}
				</button>
			))}
			{question.multiple ? (
				<button
					type="button"
					className="wg-questions-answer"
					disabled={picked.length === 0}
					onClick={() => doing.answer(question.id, picked, null)}
				>
					{ANSWER}
				</button>
			) : null}
			{question.ownAnswer ? (
				<form className="wg-questions-own" onSubmit={sendOwn}>
					<input
						className="wg-questions-own-field"
						value={own}
						placeholder={OWN_PLACEHOLDER}
						aria-label={OWN_PLACEHOLDER}
						onChange={(event) => setOwn(event.target.value)}
						onKeyDown={pressByNumber}
					/>
					<span className="wg-questions-own-hint">{SEND_HINT}</span>
				</form>
			) : null}
		</div>
	);
}
