import { z } from "zod";
import { BoardIdSchema, CameraSchema, NameSchema, PageIdSchema, TabIdSchema } from "./canvas.schema.js";

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

export const KeepCameraAskSchema = z.object({
	tabId: TabIdSchema,
	camera: CameraSchema,
});

export const WrittenBoardSchema = z.object({
	board: BoardIdSchema,
	page: PageIdSchema,
});

export const CreatedPageSchema = z.object({ page: PageIdSchema });

export type WriteBoardAsk = z.infer<typeof WriteBoardAskSchema>;
