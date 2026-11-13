import type { AnswerQuestionAsk, PostQuestionsAsk, Question, QuestionState } from "../schema/question.schema.js";

export type Moved =
	{ readonly ok: true; readonly held: readonly Question[] } | { readonly ok: false; readonly refusal: string };

const KEPT_PER_CHAT = 200;

const ALLOWED_MOVES: Readonly<Record<QuestionState, readonly QuestionState[]>> = {
	open: ["answered", "withdrawn"],
	answered: [],
	withdrawn: [],
};

const NO_SUCH = "Chat {chat} has no question {id}.";
const NOT_MOVABLE = "Question {id} is {state}, so it cannot become {next}.";
const NOT_AN_OPTION = 'Question {id} has no option "{label}".';
const ONE_OPTION_ONLY = "Question {id} takes one option, not {count}.";
const EMPTY_ANSWER = "Question {id} needs an option or the person's own words.";
const NO_OWN_ANSWER = "Question {id} takes only its options.";

export function questionsPosted(held: readonly Question[], ask: PostQuestionsAsk, now: number): Moved {
	const first = nextNumberOf(held);
	const posted = ask.questions.map((asked, at): Question => ({
		...asked,
		id: String(first + at),
		chat: ask.chat,
		state: "open",
		picked: [],
		own: null,
		askedAt: now,
		settledAt: null,
		isDelivered: false,
	}));
	return moved([...held, ...posted].slice(-KEPT_PER_CHAT));
}

export function questionAnswered(held: readonly Question[], ask: AnswerQuestionAsk, now: number): Moved {
	const found = findIn(held, ask.chat, ask.id);

	if (!found.ok) {
		return found;
	}

	const refusal = refuseAnswer(found.question, ask);

	if (refusal !== null) {
		return refused(refusal);
	}

	return changedOne(held, found.question, {
		next: "answered",
		fields: {
			picked: ask.picked,
			own: ask.own === "" ? null : ask.own,
			settledAt: now,
		},
	});
}

export function openIn(held: readonly Question[]): readonly Question[] {
	return held.filter(({ state }) => state === "open");
}

export function withdrawAllOpen(held: readonly Question[], chat: string, now: number): Moved {
	const withdrawn = held.map((question) =>
		question.chat === chat && question.state === "open"
			? {
					...question,
					state: "withdrawn" as const,
					settledAt: now,
					isDelivered: true,
				}
			: question,
	);
	return moved(withdrawn);
}

export function deliverableIn(
	held: readonly Question[],
	{ chat, ids }: { readonly chat: string; readonly ids: readonly string[] },
): readonly Question[] {
	return held.filter(
		(question) =>
			question.chat === chat && !question.isDelivered && question.state === "answered" && ids.includes(question.id),
	);
}

export function questionsDelivered(held: readonly Question[], delivered: readonly Question[]): Moved {
	const ids = new Set(delivered.map(({ chat, id }) => `${chat}/${id}`));
	return moved(
		held.map((question) =>
			ids.has(`${question.chat}/${question.id}`)
				? {
						...question,
						isDelivered: true,
					}
				: question,
		),
	);
}

function refuseAnswer(question: Question, ask: AnswerQuestionAsk): string | null {
	const labels = new Set(question.options.map(({ label }) => label));
	const stranger = ask.picked.find((label) => !labels.has(label));

	if (stranger !== undefined) {
		return NOT_AN_OPTION.replace("{id}", question.id).replace("{label}", stranger);
	}

	if (!question.multiple && ask.picked.length > 1) {
		return ONE_OPTION_ONLY.replace("{id}", question.id).replace("{count}", String(ask.picked.length));
	}

	const hasOwn = ask.own !== null && ask.own !== "";

	if (hasOwn && !question.ownAnswer) {
		return NO_OWN_ANSWER.replace("{id}", question.id);
	}

	return ask.picked.length === 0 && !hasOwn ? EMPTY_ANSWER.replace("{id}", question.id) : null;
}

type Found = { readonly ok: true; readonly question: Question } | { readonly ok: false; readonly refusal: string };

function findIn(held: readonly Question[], chat: string, id: string): Found {
	const question = held.find((each) => each.chat === chat && each.id === id);

	if (question === undefined) {
		return refused(NO_SUCH.replace("{chat}", chat).replace("{id}", id));
	}

	return {
		ok: true,
		question,
	};
}

function changedOne(
	held: readonly Question[],
	question: Question,
	{ next, fields }: { readonly next: QuestionState; readonly fields: Partial<Question> },
): Moved {
	if (!ALLOWED_MOVES[question.state].includes(next)) {
		return refused(NOT_MOVABLE.replace("{id}", question.id).replace("{state}", question.state).replace("{next}", next));
	}

	return moved(
		held.map((each) =>
			each === question
				? {
						...each,
						...fields,
						state: next,
					}
				: each,
		),
	);
}

function nextNumberOf(held: readonly Question[]): number {
	return held.reduce((most, { id }) => Math.max(most, Number(id) || 0), 0) + 1;
}

function moved(held: readonly Question[]): Moved {
	return {
		ok: true,
		held,
	};
}

function refused(refusal: string): { readonly ok: false; readonly refusal: string } {
	return {
		ok: false,
		refusal,
	};
}
