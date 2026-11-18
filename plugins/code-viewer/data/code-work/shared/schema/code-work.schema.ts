import { z } from "zod";

export const MAX_MARKS = 20;

export const MarkAskSchema = z.object({
	from: z.number().int().min(1).describe("First marked line, counted from 1"),
	to: z.number().int().min(1).nullable().default(null).describe("Last marked line; null marks one line"),
	note: z.string().trim().min(1).max(200).nullable().default(null).describe("A short note shown under the marked lines"),
});

export const ShowFileAskSchema = z.object({
	path: z.string().min(1).max(4096).startsWith("/").describe("Absolute path of a text file"),
	marks: z.array(MarkAskSchema).max(MAX_MARKS).default([]).describe("Line ranges to mark; the card opens at the first"),
});

export const MarkSchema = z.object({
	from: z.number().int().min(1),
	to: z.number().int().min(1),
	note: z.string().nullable(),
});

export const ShownFileSchema = z.object({
	path: z.string(),
	name: z.string(),
	folder: z.string(),
	lineCount: z.number().int().nonnegative(),
	marks: z.array(MarkSchema),
});

export type Mark = z.infer<typeof MarkSchema>;
