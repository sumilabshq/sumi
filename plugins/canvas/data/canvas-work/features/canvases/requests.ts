import { artboards } from "@sumi/artboards/contract";
import { query } from "#module";
import { CanvasAskSchema, CanvasRowSchema, CanvasSchema, NoAskSchema } from "../../shared/schema/canvas-work.schema.js";
import { canvasPagesOf } from "./lib/canvas-pages.js";

export const getCanvases = query()
	.public()
	.metadata({
		description:
			"List the workspace's canvases: each is a document named by its canvasId, with its pageCount and boardCount, shown by any canvas tab whose link is sumi://canvas/<canvasId>. A canvas never written to is not listed. To start a new canvas, open a tab with tabs_tab_open app canvas: a new canvas tab takes its own tab id as its canvasId.",
	})
	.input(NoAskSchema)
	.output(CanvasRowSchema.array())
	.handle((_input, { send }) => send(artboards.canvases.getCanvases, {}));

export const getCanvas = query()
	.public()
	.metadata({
		description:
			"Read a canvas whole except the HTML: its title, every page (which one the person sees) and each page's artboards with their id, name, place and size. Read this before drawing, so a new artboard fits the existing ones.",
	})
	.input(CanvasAskSchema)
	.output(CanvasSchema)
	.handle(async ({ canvasId }, { send }) => {
		const canvas = await send(artboards.canvases.getCanvas, { canvasId });
		const boards = await Promise.all(
			canvas.pages.map(({ id }) => send(artboards.boards.getBoards, { canvasId, page: id })),
		);
		return {
			canvasId,
			title: canvas.title,
			pages: canvasPagesOf(canvas, boards),
		};
	});
