import { z } from "zod";

const MOST_QUESTIONS_AT_ONCE = 4;
const MOST_OPTIONS = 6;
const MOST_IDS_AT_ONCE = 40;

export const ChatIdSchema = z.string().min(1).max(200);

export const QuestionIdSchema = z.string().min(1).max(40);

export const QuestionStateSchema = z.enum(["open", "answered", "withdrawn"]);

export type QuestionState = z.infer<typeof QuestionStateSchema>;

export const QuestionOptionSchema = z.object({
	label: z.string().trim().min(1).max(80),
	detail: z.string().trim().max(300).default(""),
});

export type QuestionOption = z.infer<typeof QuestionOptionSchema>;

export const AskedQuestionSchema = z.object({
	question: z.string().trim().min(1).max(300),
	detail: z.string().trim().max(1000).default(""),
	options: z.array(QuestionOptionSchema).max(MOST_OPTIONS).default([]),
	multiple: z.boolean().default(false),
	ownAnswer: z.boolean().default(true),
});

export type AskedQuestion = z.infer<typeof AskedQuestionSchema>;

export const QuestionSchema = AskedQuestionSchema.extend({
	id: QuestionIdSchema,
	chat: ChatIdSchema,
	state: QuestionStateSchema,
	picked: z.array(z.string()).default([]),
	own: z.string().nullable().default(null),
	askedAt: z.number(),
	settledAt: z.number().nullable().default(null),
	isDelivered: z.boolean().default(false),
});

export type Question = z.infer<typeof QuestionSchema>;

export const PostQuestionsAskSchema = z.object({
	chat: ChatIdSchema,
	questions: z.array(AskedQuestionSchema).min(1).max(MOST_QUESTIONS_AT_ONCE),
});

export type PostQuestionsAsk = z.infer<typeof PostQuestionsAskSchema>;

export const PostedSchema = z.object({
	ids: z.array(QuestionIdSchema),
});

export const ChatQuestionsAskSchema = z.object({
	chat: ChatIdSchema,
});

export const ChatQuestionsSchema = z.object({
	open: z.array(QuestionSchema),
});

export type ChatQuestions = z.infer<typeof ChatQuestionsSchema>;

export const AnswerQuestionAskSchema = z.object({
	chat: ChatIdSchema,
	id: QuestionIdSchema,
	picked: z.array(z.string().min(1).max(80)).max(MOST_OPTIONS).default([]),
	own: z.string().trim().max(4000).nullable().default(null),
});

export type AnswerQuestionAsk = z.infer<typeof AnswerQuestionAskSchema>;

export const QuestionsAskSchema = z.object({
	chat: ChatIdSchema,
	ids: z.array(QuestionIdSchema).min(1).max(MOST_IDS_AT_ONCE),
});

export const DeliveredSchema = z.object({
	questions: z.array(QuestionSchema),
	text: z.string().nullable(),
});

export const ChangedCountSchema = z.object({
	changed: z.number().int().min(0),
});

export const WaitingSchema = z.object({
	isWaiting: z.boolean(),
});
