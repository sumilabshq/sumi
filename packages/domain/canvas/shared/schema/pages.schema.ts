import { z } from "zod";

export const PageChoicesSchema = z.object({
	shown: z.string(),
	groups: z.array(z.array(z.string()).readonly()).readonly(),
});

export const PagesAskSchema = z.object({
	cursor: z.string().nullable().optional(),
	limit: z.number().int().min(1).default(100),
});

export const PageRowSchema = z.object({
	page: z.string(),
	isRunning: z.boolean(),
	isShown: z.boolean(),
});

export const PagesPageSchema = z.object({
	items: z.array(PageRowSchema).readonly(),
	next: z.string().nullable(),
	total: z.number().int().optional(),
});

export const VariantItemSchema = z.object({
	value: z.string(),
	label: z.string(),
});

export const VariantsSchema = z.object({
	isShown: z.boolean(),
	shown: z.string(),
	items: z.array(VariantItemSchema),
});

export const PageAskSchema = z.object({ page: z.string() });

export const ScreenAskSchema = z.object({ screen: z.string() });

export const WidgetAskSchema = z.object({ widget: z.string() });

export const ReturnNoteAskSchema = z.object({ cameFrom: z.string() });

export const ReturnNoteSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("note"),
		note: z.string(),
	}),
	z.object({
		kind: z.literal("none"),
		said: z.string(),
	}),
]);

export type PageRow = z.output<typeof PageRowSchema>;
export type ReturnNote = z.output<typeof ReturnNoteSchema>;
