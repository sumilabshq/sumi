import { z } from "zod";

export const TabIdSchema = z.string().min(1).max(200);

export const PageIdSchema = z.string().min(1).max(80);

export const BoardIdSchema = z.string().min(1).max(80);

export const NameSchema = z.string().trim().min(1).max(120);

export const BackgroundSchema = z
	.string()
	.regex(/^#[0-9a-f]{6}$/i)
	.nullable();

export const CameraSchema = z.object({
	x: z.number(),
	y: z.number(),
	scale: z.number().positive(),
});

export const PageSchema = z.object({
	id: PageIdSchema,
	name: NameSchema,
});

export const BoardSchema = z.object({
	id: BoardIdSchema,
	page: PageIdSchema,
	name: NameSchema,
	x: z.number(),
	y: z.number(),
	w: z.number().min(40).max(8000),
	h: z.number().min(40).max(8000),
	html: z.string().max(2_000_000),
});

export const CanvasSchema = z.object({
	title: NameSchema,
	pages: z.array(PageSchema).min(1),
	boards: z.array(BoardSchema),
	shownPage: PageIdSchema,
	isPanelOpen: z.boolean(),
	panelWidth: z.number().min(120).max(800).default(240),
	background: BackgroundSchema.default(null),
	camera: CameraSchema.nullable(),
});

export const BoardPlaceSchema = BoardSchema.omit({ html: true });

export const PageRowSchema = PageSchema.extend({ boardCount: z.number().int().nonnegative() });

export const CanvasViewSchema = z.object({
	tabId: TabIdSchema,
	title: NameSchema,
	pages: z.array(PageRowSchema),
	shownPage: PageIdSchema,
	isPanelOpen: z.boolean(),
	panelWidth: z.number(),
	background: BackgroundSchema,
	camera: CameraSchema.nullable(),
});

export const CanvasRowSchema = z.object({
	tabId: TabIdSchema,
	title: NameSchema,
	pageCount: z.number().int().nonnegative(),
	boardCount: z.number().int().nonnegative(),
});

export const BoardHitSchema = z.object({
	tabId: TabIdSchema,
	board: BoardIdSchema,
	name: NameSchema,
	page: PageIdSchema,
});

export type Camera = z.infer<typeof CameraSchema>;
export type Page = z.infer<typeof PageSchema>;
export type Board = z.infer<typeof BoardSchema>;
export type BoardPlace = z.infer<typeof BoardPlaceSchema>;
export type Canvas = z.infer<typeof CanvasSchema>;
export type CanvasView = z.infer<typeof CanvasViewSchema>;
export type CanvasRow = z.infer<typeof CanvasRowSchema>;
export type BoardHit = z.infer<typeof BoardHitSchema>;
