import { createElement as h, useState } from "react";
import type { FormEvent, ReactElement } from "react";
import type { Question } from "@sumi/contract";
import type { QuestionDoing } from "../../lib/use-question-doing.js";
import { SkipButton } from "./skip-button.js";

export interface QuestionCardProps {
	readonly question: Question;
	readonly number: number | null;
	readonly doing: QuestionDoing;
}

const SKIP = "Skip";
const ANSWER = "Answer";
const SEND = "Send";
const OWN_PLACEHOLDER = "In my own words";
const SKIP_SAYS = "Skip · {skipSays}";

export function QuestionCard({ question, number, doing }: QuestionCardProps): ReactElement {
	const [picked, setPicked] = useState<readonly string[]>([]);
	const [own, setOwn] = useState("");
	const isOptional = question.need === "optional";
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
	return (
		<div className="wg-questions-card is-open">
			<div className="wg-questions-card-head">
				{number === null ? null : <span className="wg-questions-num is-on">{number}</span>}
				<span className="wg-questions-card-question">{question.question}</span>
				{isOptional ? <SkipButton label={SKIP} onSkip={() => doing.skip([question.id])} /> : null}
			</div>
			{question.detail === "" ? null : <p className="wg-questions-card-detail">{question.detail}</p>}
			{question.options.length === 0 ? null : (
				<div className="wg-questions-card-options">
					{question.options.map((option, at) => (
						<button
							key={option.label}
							type="button"
							title={option.detail === "" ? undefined : option.detail}
							aria-pressed={question.multiple ? picked.includes(option.label) : undefined}
							className={optionClassOf({ isFirst: at === 0, isPicked: picked.includes(option.label), question })}
							onClick={() => press(option.label)}
						>
							{option.label}
						</button>
					))}
					{question.multiple ? (
						<button
							type="button"
							className="wg-questions-btn is-ink"
							disabled={picked.length === 0}
							onClick={() => doing.answer(question.id, picked, null)}
						>
							{ANSWER}
						</button>
					) : null}
				</div>
			)}
			{question.ownAnswer ? (
				<form className="wg-questions-own" onSubmit={sendOwn}>
					<input
						className="wg-questions-own-field"
						value={own}
						placeholder={OWN_PLACEHOLDER}
						aria-label={OWN_PLACEHOLDER}
						onChange={(event) => setOwn(event.target.value)}
					/>
					<button type="submit" className="wg-questions-btn" disabled={own.trim() === ""}>
						{SEND}
					</button>
				</form>
			) : null}
			{isOptional ? <p className="wg-questions-card-default">{SKIP_SAYS.replace("{skipSays}", question.skipSays)}</p> : null}
		</div>
	);
}

function optionClassOf({
	isFirst,
	isPicked,
	question,
}: {
	readonly isFirst: boolean;
	readonly isPicked: boolean;
	readonly question: Question;
}): string {
	if (question.multiple) {
		return isPicked ? "wg-questions-btn is-picked" : "wg-questions-btn";
	}

	return isFirst ? "wg-questions-btn is-ink" : "wg-questions-btn";
}
