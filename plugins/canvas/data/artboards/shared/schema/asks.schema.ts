import { z } from "zod";
import {
	BackgroundSchema,
	BoardIdSchema,
	CameraSchema,
	NameSchema,
	PageIdSchema,
	TabIdSchema,
	TweakControlSchema,
	TweakIdSchema,
	TweakValueSchema,
} from "./canvas.schema.js";

export const CanvasAskSchema = z.object({ tabId: TabIdSchema });

export const NoAskSchema = z.object({});

export const NewPageAskSchema = z.object({
	tabId: TabIdSchema,
	name: NameSchema.nullable().default(null),
});

export const PageAskSchema = z.object({
	tabId: TabIdSchema,
	page: PageIdSchema,
});

export const RenamePageAskSchema = PageAskSchema.extend({ name: NameSchema });

export const BoardsAskSchema = z.object({
	tabId: TabIdSchema,
	page: PageIdSchema.nullable().default(null),
});

export const BoardAskSchema = z.object({
	tabId: TabIdSchema,
	board: BoardIdSchema,
});

export const WriteBoardAskSchema = z.object({
	tabId: TabIdSchema,
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
	tabId: TabIdSchema,
	width: z.number(),
});

export const SetBackgroundAskSchema = z.object({
	tabId: TabIdSchema,
	background: BackgroundSchema,
});

export const KeepCameraAskSchema = z.object({
	tabId: TabIdSchema,
	camera: CameraSchema,
});

export const TweaksAskSchema = z.object({
	tabId: TabIdSchema,
	page: PageIdSchema.nullable().default(null),
});

export const TweakAskSchema = z.object({
	id: TweakIdSchema,
	label: NameSchema,
	control: TweakControlSchema,
	value: TweakValueSchema,
});

export const WriteTweaksAskSchema = z.object({
	tabId: TabIdSchema,
	page: PageIdSchema.nullable().default(null),
	board: BoardIdSchema.nullable().default(null),
	tweaks: z.array(TweakAskSchema).max(24),
});

export const SetTweakValueAskSchema = z.object({
	tabId: TabIdSchema,
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
