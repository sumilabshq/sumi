import { z } from "zod";

export const MAX_VIEW_HTML = 200_000;

export const CHAT_VIEW_URI = "ui://chat-view";

export const ViewIdSchema = z
	.string()
	.regex(/^[a-z0-9][a-z0-9-]{0,79}$/)
	.describe("A saved view's id, from view-work_views_saved");

export const ReadGuideAskSchema = z.object({});

export const ViewGuideSchema = z.string();

export const ShowViewAskSchema = z.object({
	guideRead: z.boolean().describe("true once you called view-work_guide_read in this chat; the view is checked against its rules"),
	title: z.string().trim().min(1).max(80).describe("A short title in the person's language"),
	purpose: z
		.string()
		.trim()
		.min(1)
		.max(200)
		.describe("One line: what this view is for, so it can be found and reused later"),
	html: z.string().min(1).max(MAX_VIEW_HTML).describe("The view: an HTML fragment, no html, head or body"),
	id: ViewIdSchema.nullable()
		.default(null)
		.describe("A saved view to replace when the person asked to change it; null saves a new view"),
});

export const ShownViewSchema = z.object({
	id: ViewIdSchema,
	title: z.string(),
	path: z.string().nullable(),
	builtIn: z.boolean(),
});

export const StoredViewSchema = z.object({
	id: ViewIdSchema,
	title: z.string(),
	purpose: z.string(),
	updatedMs: z.number().int().nonnegative(),
	html: z.string(),
});

export const SavedViewSchema = StoredViewSchema.omit({ html: true }).extend({
	builtIn: z.boolean().describe("Shipped with Sumi and read only: duplicate it to change it"),
});

export const ReadViewSchema = StoredViewSchema.extend({
	builtIn: z.boolean(),
});

export const SavedViewsSchema = z.array(SavedViewSchema);

export const DuplicateViewAskSchema = z.object({
	id: ViewIdSchema,
	title: z.string().trim().min(1).max(80).nullable().default(null).describe("The copy's title; null keeps the original's"),
});

export const OneViewAskSchema = z.object({
	id: ViewIdSchema,
});

export const RemovedViewSchema = z.object({
	id: ViewIdSchema,
	removed: z.boolean(),
});

export type ShowViewAsk = z.output<typeof ShowViewAskSchema>;
export type ShownView = z.output<typeof ShownViewSchema>;
export type SavedView = z.output<typeof SavedViewSchema>;
export type ReadView = z.output<typeof ReadViewSchema>;
export type StoredView = z.output<typeof StoredViewSchema>;
