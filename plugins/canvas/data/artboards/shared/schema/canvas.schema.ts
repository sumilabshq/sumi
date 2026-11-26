import { z } from "zod";

export const CanvasIdSchema = z.string().min(1).max(200);

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

export const AreaSchema = z.object({
	x: z.number(),
	y: z.number(),
	w: z.number().positive(),
	h: z.number().positive(),
});

export const ChatViewIdSchema = z.string().max(80);

export const ChatViewSchema = z.object({
	pages: z.array(PageIdSchema).min(1).max(12),
	page: PageIdSchema,
	boards: z.array(BoardIdSchema).max(40).default([]),
	area: AreaSchema.nullable().default(null),
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

export const TweakIdSchema = z.string().regex(/^[a-z][a-z0-9-]{0,39}$/);

export const TweakValueSchema = z.union([z.number(), z.boolean(), z.string().max(80)]);

export const TweakControlSchema = z.discriminatedUnion("kind", [
	z.object({
		kind: z.literal("number"),
		min: z.number(),
		max: z.number(),
		step: z.number().positive(),
		unit: z.string().max(8),
	}),
	z.object({ kind: z.literal("toggle") }),
	z.object({
		kind: z.literal("choice"),
		options: z.array(z.string().trim().min(1).max(80)).min(2).max(8),
	}),
]);

export const TweakSchema = z.object({
	id: TweakIdSchema,
	label: NameSchema,
	page: PageIdSchema,
	board: BoardIdSchema.nullable(),
	control: TweakControlSchema,
	initial: TweakValueSchema,
	value: TweakValueSchema,
});

export const AppliedTweakSchema = z.object({
	id: TweakIdSchema,
	value: TweakValueSchema,
	css: z.string(),
});

export const BoardTweaksSchema = z.object({
	board: BoardIdSchema,
	applied: z.array(AppliedTweakSchema),
});

export const CanvasSchema = z.object({
	title: NameSchema,
	pages: z.array(PageSchema).min(1),
	boards: z.array(BoardSchema),
	tweaks: z.array(TweakSchema).default([]),
	shownPage: PageIdSchema,
	isPanelOpen: z.boolean(),
	panelWidth: z.number().min(120).max(800).default(240),
	background: BackgroundSchema.default(null),
	camera: CameraSchema.nullable(),
	chatViews: z.record(z.string(), ChatViewSchema).default({}),
	editedAt: z.number().nonnegative().default(0),
});

export const BoardPlaceSchema = BoardSchema.omit({ html: true });

export const PageRowSchema = PageSchema.extend({ boardCount: z.number().int().nonnegative() });

export const CanvasViewSchema = z.object({
	canvasId: CanvasIdSchema,
	title: NameSchema,
	pages: z.array(PageRowSchema),
	shownPage: PageIdSchema,
	isPanelOpen: z.boolean(),
	panelWidth: z.number(),
	background: BackgroundSchema,
	camera: CameraSchema.nullable(),
});

export const CanvasRowSchema = z.object({
	canvasId: CanvasIdSchema,
	title: NameSchema,
	pageCount: z.number().int().nonnegative(),
	boardCount: z.number().int().nonnegative(),
	editedAt: z.number().nonnegative(),
});

export const CanvasOrderSchema = z.enum(["edited", "name"]);

export const CanvasesPageSchema = z.object({
	rows: z.array(CanvasRowSchema),
	total: z.number().int().nonnegative(),
});

export const BoardHitSchema = z.object({
	canvasId: CanvasIdSchema,
	board: BoardIdSchema,
	name: NameSchema,
	page: PageIdSchema,
});

export type Camera = z.infer<typeof CameraSchema>;
export type Area = z.infer<typeof AreaSchema>;
export type ChatView = z.infer<typeof ChatViewSchema>;
export type Page = z.infer<typeof PageSchema>;
export type Board = z.infer<typeof BoardSchema>;
export type Tweak = z.infer<typeof TweakSchema>;
export type TweakControl = z.infer<typeof TweakControlSchema>;
export type TweakValue = z.infer<typeof TweakValueSchema>;
export type AppliedTweak = z.infer<typeof AppliedTweakSchema>;
export type BoardTweaks = z.infer<typeof BoardTweaksSchema>;
export type BoardPlace = z.infer<typeof BoardPlaceSchema>;
export type Canvas = z.infer<typeof CanvasSchema>;
export type CanvasView = z.infer<typeof CanvasViewSchema>;
export type CanvasRow = z.infer<typeof CanvasRowSchema>;
export type CanvasOrder = z.infer<typeof CanvasOrderSchema>;
export type CanvasesPage = z.infer<typeof CanvasesPageSchema>;
export type BoardHit = z.infer<typeof BoardHitSchema>;
