import { z } from "zod";
import {
	BackgroundSchema,
	BoardIdSchema,
	CameraSchema,
	NameSchema,
	PageIdSchema,
	CanvasIdSchema,
	TweakControlSchema,
	TweakIdSchema,
	TweakValueSchema,
} from "./canvas.schema.js";

export const CanvasAskSchema = z.object({ canvasId: CanvasIdSchema });

export const NoAskSchema = z.object({});

export const NewPageAskSchema = z.object({
	canvasId: CanvasIdSchema,
	name: NameSchema.nullable().default(null),
});

export const PageAskSchema = z.object({
	canvasId: CanvasIdSchema,
	page: PageIdSchema,
});

export const RenamePageAskSchema = PageAskSchema.extend({ name: NameSchema });

export const BoardsAskSchema = z.object({
	canvasId: CanvasIdSchema,
	page: PageIdSchema.nullable().default(null),
});

export const BoardAskSchema = z.object({
	canvasId: CanvasIdSchema,
	board: BoardIdSchema,
});

export const WriteBoardAskSchema = z.object({
	canvasId: CanvasIdSchema,
	board: BoardIdSchema.nullable().default(null),
	page: PageIdSchema.nullable().default(null),
	name: NameSchema.nullable().default(null),
	html: z.string().max(2_000_000),
	w: z.number().min(40).max(8000).nullable().default(null),
	h: z.number().min(40).max(8000).nullable().default(null),
	x: z.number().nullable().default(null),
	y: z.number().nullable().default(null),
});

export const MoveBoardAskSchema = BoardAskSchema.extend({
	x: z.number(),
	y: z.number(),
});

export const RenameBoardAskSchema = BoardAskSchema.extend({ name: NameSchema });

export const SearchAskSchema = z.object({ words: z.string().trim().min(1).max(200) });

export const ResizePanelAskSchema = z.object({
	canvasId: CanvasIdSchema,
	width: z.number(),
});

export const SetBackgroundAskSchema = z.object({
	canvasId: CanvasIdSchema,
	background: BackgroundSchema,
});

export const KeepCameraAskSchema = z.object({
	canvasId: CanvasIdSchema,
	camera: CameraSchema,
});

export const TweaksAskSchema = z.object({
	canvasId: CanvasIdSchema,
	page: PageIdSchema.nullable().default(null),
});

export const TweakAskSchema = z.object({
	id: TweakIdSchema,
	label: NameSchema,
	control: TweakControlSchema,
	value: TweakValueSchema,
});

export const WriteTweaksAskSchema = z.object({
	canvasId: CanvasIdSchema,
	page: PageIdSchema.nullable().default(null),
	board: BoardIdSchema.nullable().default(null),
	tweaks: z.array(TweakAskSchema).max(24),
});

export const SetTweakValueAskSchema = z.object({
	canvasId: CanvasIdSchema,
	page: PageIdSchema,
	board: BoardIdSchema.nullable(),
	tweak: TweakIdSchema,
	value: TweakValueSchema,
});

export const WrittenBoardSchema = z.object({
	board: BoardIdSchema,
	page: PageIdSchema,
});

export const CreatedPageSchema = z.object({ page: PageIdSchema });

export type WriteBoardAsk = z.infer<typeof WriteBoardAskSchema>;
export type TweakAsk = z.infer<typeof TweakAskSchema>;
