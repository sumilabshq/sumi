import { refuse } from "@widgetarium/data-framework";
import { artboards } from "@sumi/artboards/contract";
import { query } from "#module";
import { BoardAskSchema, PageShotAskSchema, ShotSchema } from "../../shared/schema/canvas-work.schema.js";

const MOST_BOARD_SIDE = 2000;
const MOST_PAGE_SIDE = 2400;

export const getBoardShot = query()
	.public()
	.metadata({
		description:
			"See an artboard as a PNG, drawn from its HTML at its frame size (scaled down past 2000 px a side). Look at it after every writeBoard and fix what is off before telling the person it is done. Web fonts may fall back to system fonts in the shot.",
	})
	.input(BoardAskSchema)
	.output(ShotSchema)
	.handle(async (ask, { send, rendering }) => {
		const board = await send(artboards.boards.getBoard, ask);
		return rendering.shotOf([board], MOST_BOARD_SIDE);
	});

export const getPageShot = query()
	.public()
	.metadata({
		description:
			"See a whole page of a canvas as one PNG: every artboard at its place, scaled to fit 2400 px. Use it to check how the artboards sit together.",
	})
	.input(PageShotAskSchema)
	.output(ShotSchema)
	.handle(async ({ tabId, page }, { send, rendering }) => {
		const canvas = await send(artboards.canvases.getCanvas, { tabId });
		const shown = page ?? canvas.shownPage;
		const placed = await send(artboards.boards.getBoards, { tabId, page: shown });

		if (placed.length === 0) {
			return refuse(`page ${shown} has no artboards yet`);
		}

		const boards = await Promise.all(
			placed.map((place) => send(artboards.boards.getBoard, { tabId, board: place.id })),
		);
		return rendering.shotOf(boards, MOST_PAGE_SIDE);
	});
