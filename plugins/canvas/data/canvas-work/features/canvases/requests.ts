import { artboards } from "@sumi/artboards/contract";
import { query } from "#module";
import { CanvasAskSchema, CanvasRowSchema, CanvasSchema, NoAskSchema } from "../../shared/schema/canvas-work.schema.js";
import { canvasPagesOf } from "./lib/canvas-pages.js";

export const getCanvases = query()
	.public()
	.metadata({
		description:
			"List the workspace's canvases: each is a canvas tab, named by its tabId, with its pageCount and boardCount. A canvas never written to is not listed. To start a new canvas, open a tab with tabs_tab_open app canvas and use the tab id it answers.",
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
	.handle(async ({ tabId }, { send }) => {
		const canvas = await send(artboards.canvases.getCanvas, { tabId });
		const boards = await Promise.all(
			canvas.pages.map(({ id }) => send(artboards.boards.getBoards, { tabId, page: id })),
		);
		return {
			tabId,
			title: canvas.title,
			pages: canvasPagesOf(canvas, boards),
		};
	});
