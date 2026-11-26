import { refuse } from "@widgetarium/data-framework";
import { artboards } from "@sumi/artboards/contract";
import { query } from "#module";
import { CARD_SIZE, aimedBoxOf, boxAround, cardLookOf } from "../../shared/lib/card-look.js";
import { BoardAskSchema, PageShotAskSchema, ShotSchema, ViewShotAskSchema } from "../../shared/schema/canvas-work.schema.js";

const MOST_BOARD_SIDE = 2000;
const MOST_PAGE_SIDE = 2400;

export const getBoardShot = query()
	.public()
	.metadata({
		description:
			"See an artboard as a PNG, drawn from its HTML at its frame size (scaled down past 2000 px a side), with its tweaks' CSS variables and attributes as the person left them. Look at it after every writeBoard and fix what is off before telling the person it is done. Web fonts may fall back to system fonts in the shot, and scripts do not run in it.",
	})
	.input(BoardAskSchema)
	.output(ShotSchema)
	.handle(async (ask, { send, rendering }) => {
		const board = await send(artboards.boards.getBoard, ask);
		const tweaked = await send(artboards.tweaks.getBoardTweaks, { canvasId: ask.canvasId, page: board.page });
		return rendering.shotOf([{ ...board, tweaks: tweaked.find((one) => one.board === board.id)?.applied ?? [] }], MOST_BOARD_SIDE);
	});

export const getPageShot = query()
	.public()
	.metadata({
		description:
			"See a whole page of a canvas as one PNG: every artboard at its place, scaled to fit 2400 px. Use it to check how the artboards sit together.",
	})
	.input(PageShotAskSchema)
	.output(ShotSchema)
	.handle(async ({ canvasId, page }, { send, rendering }) => {
		const canvas = await send(artboards.canvases.getCanvas, { canvasId });
		const shown = page ?? canvas.shownPage;
		const placed = await send(artboards.boards.getBoards, { canvasId, page: shown });

		if (placed.length === 0) {
			return refuse(`page ${shown} has no artboards yet`);
		}

		const tweaked = await send(artboards.tweaks.getBoardTweaks, { canvasId, page: shown });
		const boards = await Promise.all(
			placed.map((place) => send(artboards.boards.getBoard, { canvasId, board: place.id })),
		);
		return rendering.shotOf(
			boards.map((board) => ({ ...board, tweaks: tweaked.find((one) => one.board === board.id)?.applied ?? [] })),
			MOST_PAGE_SIDE,
		);
	});

export const getViewShot = query()
	.public()
	.metadata({
		description:
			"See the chat card as the person will see it, before or after posting: a 720x420 PNG of exactly the region the card frames. Give a view id from show-canvas to shoot a posted card, or the page, boards and area you plan to show-canvas with.",
	})
	.input(ViewShotAskSchema)
	.output(ShotSchema)
	.handle(async ({ canvasId, view, page, boards, area }, { send, rendering }) => {
		const stored = view === null ? null : await send(artboards.chatViews.getChatView, { canvasId, view });

		if (view !== null && stored === null) {
			return refuse(`no card ${view} on the canvas; show-canvas answers the view id of a card it posted`);
		}

		const canvas = await send(artboards.canvases.getCanvas, { canvasId });
		const aim = stored ?? { page: page ?? canvas.shownPage, boards, area };
		const placed = await send(artboards.boards.getBoards, { canvasId, page: aim.page });

		if (placed.length === 0) {
			return refuse(`page ${aim.page} has no artboards yet`);
		}

		const stray = aim.boards.find((id) => !placed.some((place) => place.id === id));

		if (stray !== undefined) {
			return refuse(`artboard ${stray} is not on page ${aim.page}; list them with getCanvas`);
		}

		const look = cardLookOf(aimedBoxOf(aim, placed) ?? boxAround(placed), CARD_SIZE);
		const frame = { x: -look.x / look.scale, y: -look.y / look.scale, w: CARD_SIZE.width / look.scale, h: CARD_SIZE.height / look.scale };
		const seen = placed.filter(
			(place) => place.x < frame.x + frame.w && place.x + place.w > frame.x && place.y < frame.y + frame.h && place.y + place.h > frame.y,
		);
		const tweaked = await send(artboards.tweaks.getBoardTweaks, { canvasId, page: aim.page });
		const drawn = await Promise.all(seen.map((place) => send(artboards.boards.getBoard, { canvasId, board: place.id })));
		return rendering.shotOf(
			drawn.map((board) => ({ ...board, tweaks: tweaked.find((one) => one.board === board.id)?.applied ?? [] })),
			CARD_SIZE.width,
			frame,
		);
	});
