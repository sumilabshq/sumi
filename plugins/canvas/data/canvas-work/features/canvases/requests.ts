import { artboards } from "@sumi/artboards/contract";
import { PerCall, Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query } from "#module";
import {
	AimViewAskSchema,
	CanvasAskSchema,
	ChatViewSchema,
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

export const showCanvas = command()
	.public()
	.metadata({
		description:
			"Show a canvas in this chat as a small live canvas the person can pan, zoom and switch pages in, with a link to open it whole. Call it after drawing, so the person sees the result without leaving the chat. Pick the pages that matter (only they become tabs) and aim the camera with boards or area. Preview the card with get-view-shot before posting; to change a posted card, call aim-view with the view id this answers instead of posting a second card.",
		mcp: {
			kind: "read",
			running: "Showing the canvas",
			done: "Showed the canvas",
			ui: { resourceUri: "ui://canvas-mini" },
		},
	})
	.input(ShowCanvasAskSchema)
	.output(ShownCanvasSchema)
	.idempotencyKey(PerCall)
	.handle(async ({ canvasId, pages, page, boards, area }, { send }) => {
		const canvas = await send(artboards.canvases.getCanvas, { canvasId });
		const first = page ?? pages[0] ?? canvas.shownPage;
		const shown = canvas.pages.find(({ id }) => id === first);

		if (shown === undefined) {
			return refuse(NO_PAGE.replace("{page}", first));
		}

		const view = `view-${crypto.randomUUID()}`;
		await send(artboards.chatViews.keepChatView, { canvasId, view, chatView: { pages, page: first, boards, area } });
		return {
			canvasId,
			title: canvas.title,
			page: shown.id,
			pageName: shown.name,
			boardCount: shown.boardCount,
			view,
			pages,
		};
	});

export const aimView = command()
	.public()
	.metadata({
		description:
			"Re-aim a card show-canvas posted, by its view id: change its tabs, page, framed artboards or zoom region. The card in the chat follows live; null fields keep what is stored. Changing the page without boards clears the framed artboards. Check the result with get-view-shot.",
	})
	.input(AimViewAskSchema)
	.output(ChatViewSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ canvasId, view, pages, page, boards, area, clearArea }, { send }) => {
		const stored = await send(artboards.chatViews.getChatView, { canvasId, view });

		if (stored === null) {
			return refuse(`no card ${view} on the canvas; show-canvas answers the view id of a card it posted`);
		}

		const nextPages = pages ?? stored.pages;
		const nextPage = page ?? (nextPages.includes(stored.page) ? stored.page : (nextPages[0] ?? stored.page));
		const aimed = {
			pages: nextPages,
			page: nextPage,
			boards: boards ?? (nextPage === stored.page ? stored.boards : []),
			area: clearArea ? null : (area ?? stored.area),
		};
		await send(artboards.chatViews.keepChatView, { canvasId, view, chatView: aimed });
		return aimed;
	});
