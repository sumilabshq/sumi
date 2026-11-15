import { z } from "zod";
import { LayerSchema } from "./layer.schema.js";

export const CanvasIdSchema = z
	.string()
	.min(1)
	.max(200)
	.describe("The canvas document's id, from getCanvases, or the id of a new canvas tab from tabs_tab_open");

export const PageIdSchema = z.string().min(1).max(80).describe("A page id from getCanvas, such as page-1");

export const BoardIdSchema = z.string().min(1).max(80).describe("An artboard id from getCanvas, such as board-3");

export const NameSchema = z.string().trim().min(1).max(120);

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

export const BoardAskSchema = z.object({
	canvasId: CanvasIdSchema,
	board: BoardIdSchema,
});

export const WriteBoardAskSchema = z.object({
	canvasId: CanvasIdSchema,
	board: BoardIdSchema.nullable().default(null).describe("An existing artboard to rewrite; null adds a new one"),
	page: PageIdSchema.nullable().default(null).describe("The page a new artboard goes on; null is the shown page"),
	name: NameSchema.nullable().default(null),
	html: z.string().max(2_000_000).describe("The artboard's whole HTML document: styles inline or in <style>"),
	w: z.number().min(40).max(8000).nullable().default(null).describe("Frame width in CSS px; 1440 when null"),
	h: z.number().min(40).max(8000).nullable().default(null).describe("Frame height in CSS px; 900 when null"),
	x: z.number().nullable().default(null).describe("Place on the canvas; null puts a new one right of the others"),
	y: z.number().nullable().default(null),
});

export const MoveBoardAskSchema = BoardAskSchema.extend({
	x: z.number(),
	y: z.number(),
});

export const RenameBoardAskSchema = BoardAskSchema.extend({ name: NameSchema });

export const RenameLayerAskSchema = BoardAskSchema.extend({
	path: z
		.string()
		.regex(/^\d+(\.\d+)*$/)
		.max(200)
		.describe("The layer's path from getBoard, such as 0.2.1"),
	name: NameSchema,
});

export const SearchAskSchema = z.object({ words: z.string().trim().min(1).max(200) });

export const PageShotAskSchema = z.object({
	canvasId: CanvasIdSchema,
	page: PageIdSchema.nullable().default(null).describe("null shoots the shown page"),
});

export const BoardPlaceSchema = z.object({
	id: z.string(),
	name: z.string(),
	x: z.number(),
	y: z.number(),
	w: z.number(),
	h: z.number(),
});

export const CanvasPageSchema = z.object({
	id: z.string(),
	name: z.string(),
	isShown: z.boolean(),
	boards: z.array(BoardPlaceSchema),
});

export const CanvasSchema = z.object({
	canvasId: z.string(),
	title: z.string(),
	pages: z.array(CanvasPageSchema),
});

export const CanvasRowSchema = z.object({
	canvasId: z.string(),
	title: z.string(),
	pageCount: z.number().int().nonnegative(),
	boardCount: z.number().int().nonnegative(),
});

export const BoardReadSchema = z.object({
	id: z.string(),
	page: z.string(),
	name: z.string(),
	x: z.number(),
	y: z.number(),
	w: z.number(),
	h: z.number(),
	html: z.string(),
	layers: z.array(LayerSchema),
});

export const WrittenBoardSchema = z.object({
	board: z.string(),
	page: z.string(),
});

export const CreatedPageSchema = z.object({ page: z.string() });

export const BoardHitSchema = z.object({
	canvasId: z.string(),
	board: z.string(),
	name: z.string(),
	page: z.string(),
});

export const ShotSchema = z.object({
	png: z.string(),
	width: z.number(),
	height: z.number(),
});
