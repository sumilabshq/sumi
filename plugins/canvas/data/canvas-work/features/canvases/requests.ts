import { artboards } from "@sumi/artboards/contract";
import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query } from "#module";
import {
	CanvasAskSchema,
	CanvasRowSchema,
	CanvasSchema,
	NoAskSchema,
	RenameCanvasAskSchema,
	ShowCanvasAskSchema,
	ShownCanvasSchema,
} from "../../shared/schema/canvas-work.schema.js";
import { canvasPagesOf } from "./lib/canvas-pages.js";

const NO_PAGE = "the canvas has no page {page}; list them with getCanvas";

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

export const renameCanvas = command()
	.public()
	.metadata({
		description:
			"Name a canvas for what it holds (Sumi header, Onboarding flow). A new canvas is \"Untitled canvas\": name it with its first artboard, so its tab and the canvas home say what it is.",
	})
	.input(RenameCanvasAskSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { send }) => send(artboards.canvases.renameCanvas, ask));

export const showCanvas = query()
	.public()
	.metadata({
		description:
			"Show a canvas in this chat as a small live canvas the person can pan, zoom and switch pages in, with a link to open it whole. Call it after drawing, so the person sees the result without leaving the chat.",
		mcp: {
			kind: "read",
			running: "Showing the canvas",
			done: "Showed the canvas",
			ui: { resourceUri: "ui://canvas-mini" },
		},
	})
	.input(ShowCanvasAskSchema)
	.output(ShownCanvasSchema)
	.handle(async ({ canvasId, page }, { send }) => {
		const canvas = await send(artboards.canvases.getCanvas, { canvasId });
		const shown = canvas.pages.find(({ id }) => id === (page ?? canvas.shownPage));

		if (shown === undefined) {
			return refuse(NO_PAGE.replace("{page}", page ?? canvas.shownPage));
		}

		return {
			canvasId,
			title: canvas.title,
			page: shown.id,
			pageName: shown.name,
			boardCount: shown.boardCount,
		};
	});
