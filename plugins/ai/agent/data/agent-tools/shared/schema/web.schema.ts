import { z } from "zod";

export const PageAskedSchema = z.object({
	url: z.string().url().max(4096).describe("An http or https address"),
	from: z
		.number()
		.int()
		.min(0)
		.optional()
		.describe("Character to start from, for a long page: the next of the last answer"),
});

export const PageSchema = z.object({
	url: z.string(),
	text: z.string(),
	next: z.number().int().nullable(),
});

export const SearchAskedSchema = z.object({
	query: z.string().min(1).max(400),
});

export const FoundPageSchema = z.object({
	title: z.string(),
	url: z.string(),
	snippet: z.string(),
});

export type FoundPage = z.infer<typeof FoundPageSchema>;

export const FoundPagesSchema = z.object({
	results: z.array(FoundPageSchema),
});
