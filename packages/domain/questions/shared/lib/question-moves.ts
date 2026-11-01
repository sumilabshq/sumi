import { MOST_NEEDED_AT_ONCE } from "../schema/question.schema.js";
import type {
	AnswerQuestionAsk,
	PostQuestionsAsk,
	Question,
	QuestionState,
} from "../schema/question.schema.js";

export type Moved = { readonly ok: true; readonly held: readonly Question[] } | { readonly ok: false; readonly refusal: string };

const KEPT_PER_CHAT = 200;

const ALLOWED_MOVES: Readonly<Record<QuestionState, readonly QuestionState[]>> = {
	open: ["answered", "skipped", "withdrawn"],
	answered: ["open"],
	skipped: ["open"],
	withdrawn: [],
};

const TOO_MANY_NEEDED = "Ask at most {most} needed questions at once; the person answers them one by one.";
const NEEDS_SKIP_SAYS = "An optional question says what you do when it is skipped: \"{question}\" has no skipSays.";
const NO_SUCH = "Chat {chat} has no question {id}.";
const NOT_MOVABLE = "Question {id} is {state}, so it cannot become {next}.";
const NEEDED_NOT_SKIPPED = "Question {id} is needed: Sumi cannot go on without its answer, so it cannot be skipped.";
const ALREADY_DELIVERED = "Question {id} was already handed to the agent, so its answer stays.";
const NOT_AN_OPTION = "Question {id} has no option \"{label}\".";
const ONE_OPTION_ONLY = "Question {id} takes one option, not {count}.";
const EMPTY_ANSWER = "Question {id} needs an option or the person's own words.";
const NO_OWN_ANSWER = "Question {id} takes only its options.";

export function questionsPosted(held: readonly Question[], ask: PostQuestionsAsk, now: number): Moved {
	if (ask.need === "needed" && ask.questions.length > MOST_NEEDED_AT_ONCE) {
		return refused(TOO_MANY_NEEDED.replace("{most}", String(MOST_NEEDED_AT_ONCE)));
	}

	const silent = ask.questions.find((asked) => ask.need === "optional" && asked.skipSays === "");

	if (silent !== undefined) {
		return refused(NEEDS_SKIP_SAYS.replace("{question}", silent.question));
	}

	const first = nextNumberOf(held);
	const posted = ask.questions.map(
		(asked, at): Question => ({
			...asked,
			id: String(first + at),
			chat: ask.chat,
			need: ask.need,
			state: "open",
			picked: [],
			own: null,
			askedAt: now,
			settledAt: null,
			isDelivered: false,
		}),
	);
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

export function questionsSkipped(
	held: readonly Question[],
	{ chat, ids }: { readonly chat: string; readonly ids: readonly string[] },
	now: number,
): Moved {
	return ids.reduce<Moved>((was, id) => {
		if (!was.ok) {
			return was;
		}

		const found = findIn(was.held, chat, id);

		if (!found.ok) {
			return found;
		}

		if (found.question.need === "needed") {
			return refused(NEEDED_NOT_SKIPPED.replace("{id}", id));
		}

		return changedOne(was.held, found.question, {
			next: "skipped",
			fields: {
				picked: [],
				own: null,
				settledAt: now,
			},
		});
	}, moved(held));
}

export function questionReopened(held: readonly Question[], { chat, id }: { readonly chat: string; readonly id: string }): Moved {
	const found = findIn(held, chat, id);

	if (!found.ok) {
		return found;
	}

	if (found.question.isDelivered) {
		return refused(ALREADY_DELIVERED.replace("{id}", id));
	}

	return changedOne(held, found.question, {
		next: "open",
		fields: {
			picked: [],
			own: null,
			settledAt: null,
		},
	});
}

export function neededWithdrawn(held: readonly Question[], chat: string, now: number): Moved {
	const withdrawn = held.map((question) =>
		question.chat === chat && question.need === "needed" && question.state === "open"
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
	{ chat, ids }: { readonly chat: string; readonly ids: readonly string[] | null },
): readonly Question[] {
	return held.filter(
		(question) =>
			question.chat === chat &&
			!question.isDelivered &&
			isSettled(question.state) &&
			(ids === null ? question.need === "optional" : ids.includes(question.id)),
	);
}

export function answersReadyIn(held: readonly Question[], chat: string): readonly Question[] {
	const optional = held.filter((question) => question.chat === chat && question.need === "optional");

	if (optional.some(({ state }) => state === "open")) {
		return [];
	}

	return deliverableIn(held, {
		chat,
		ids: null,
	});
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

export function isSettled(state: QuestionState): boolean {
	return state === "answered" || state === "skipped";
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
		return refused(
			NOT_MOVABLE.replace("{id}", question.id).replace("{state}", question.state).replace("{next}", next),
		);
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
