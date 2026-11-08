import { z } from "zod";

const MOST_NEEDED_AT_ONCE = 4;
const MOST_OPTIONAL_AT_ONCE = 10;
const MOST_OPTIONS = 6;

const QuestionTextSchema = z
	.string()
	.trim()
	.min(1)
	.max(300)
	.describe("One short question, ending with a question mark.");

const OptionSchema = z.object({
	label: z.string().trim().min(1).max(80),
	detail: z.string().trim().max(300).nullish(),
});

const MultipleSchema = z.boolean().nullish().describe("The person may pick several options (default false).");

const OwnAnswerSchema = z
	.boolean()
	.nullish()
	.describe("The person may answer in their own words beside the options (default true).");

const NeededQuestionSchema = z.object({
	question: QuestionTextSchema,
	detail: z.string().trim().max(1000).nullish().describe("One or two lines of why you ask, shown under the question."),
	options: z
		.array(OptionSchema)
		.max(MOST_OPTIONS)
		.nullish()
		.describe("The answers the person presses, most likely first. None means they type an answer."),
	multiple: MultipleSchema,
	ownAnswer: OwnAnswerSchema,
});

const OptionalQuestionSchema = z.object({
	question: QuestionTextSchema,
	detail: z.string().trim().max(1000).nullish().describe("One or two lines of context, shown when the card opens."),
	options: z
		.array(OptionSchema)
		.max(MOST_OPTIONS)
		.nullish()
		.describe("The answers the person presses, your pick first. None means they type an answer."),
	multiple: MultipleSchema,
	ownAnswer: OwnAnswerSchema,
	skipSays: z
		.string()
		.trim()
		.min(1)
		.max(200)
		.describe('What you do when the person skips it, in your words: "I leave it and list it at the end".'),
});

export type AskQuestion = z.infer<typeof NeededQuestionSchema> & {
	readonly skipSays?: string;
};

export const NeededAskSchema = z.object({
	questions: z.array(NeededQuestionSchema).min(1).max(MOST_NEEDED_AT_ONCE),
});

export const OptionalAskSchema = z.object({
	questions: z.array(OptionalQuestionSchema).min(1).max(MOST_OPTIONAL_AT_ONCE),
});

export const NeededAnswersSchema = z.object({
	answers: z.array(
		z.object({
			question: z.string(),
			picked: z.array(z.string()),
			own: z.string().nullable(),
			skipped: z.string().optional(),
		}),
	),
});

export const OptionalPostedSchema = z.object({
	ids: z.array(z.string()),
	said: z.string(),
});
