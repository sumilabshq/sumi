import { Repeatable, refuse } from "@widgetarium/data-framework";
import { command, query, subscriber } from "#module";
import { canvasesChanged } from "../../gateways/canvases/canvases.events.js";
import {
	boardOf,
	boardsOnPage,
	withMovedBoard,
	withRenamedBoard,
	withWrittenBoard,
	withoutBoard,
} from "../../shared/lib/canvas-edits.js";
import { hitsOf, placeOf } from "../../shared/lib/canvas-views.js";
import {
	BoardAskSchema,
	BoardsAskSchema,
	CanvasAskSchema,
	MoveBoardAskSchema,
	RenameBoardAskSchema,
	SearchAskSchema,
	WriteBoardAskSchema,
	WrittenBoardSchema,
} from "../../shared/schema/asks.schema.js";
import { BoardHitSchema, BoardPlaceSchema, BoardSchema } from "../../shared/schema/canvas.schema.js";

export const getBoards = query()
	.public()
	.input(BoardsAskSchema)
	.output(BoardPlaceSchema.array())
	.handle(({ tabId, page }, { canvases }) => {
		const canvas = canvases.canvas(tabId);
		return boardsOnPage(canvas, page ?? canvas.shownPage).map(placeOf);
	});

export const getShownPageBoards = query()
	.public()
	.input(CanvasAskSchema)
	.output(BoardSchema.array())
	.handle(({ tabId }, { canvases }) => {
		const canvas = canvases.canvas(tabId);
		return [...boardsOnPage(canvas, canvas.shownPage)];
	});

export const getBoard = query()
	.public()
	.input(BoardAskSchema)
	.output(BoardSchema)
	.handle(({ tabId, board }, { canvases }) => {
		const found = boardOf(canvases.canvas(tabId), board);
		return found ?? refuse(`the canvas has no artboard ${board}; list them with getBoards`);
	});

export const getBoardsMatching = query()
	.public()
	.input(SearchAskSchema)
	.output(BoardHitSchema.array())
	.handle(({ words }, { canvases }) => [...hitsOf(canvases.canvases(), words)]);

export const writeBoard = command()
	.public()
	.input(WriteBoardAskSchema)
	.output(WrittenBoardSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { canvases }) => {
		const written = withWrittenBoard(canvases.canvas(ask.tabId), ask);

		if (typeof written === "string") {
			return refuse(written);
		}

		canvases.saveCanvas(ask.tabId, written.canvas, written.reason);
		console.info(`[artboards] ${ask.tabId}: ${written.reason}`);
		return {
			board: written.id.id,
			page: written.id.page,
		};
	});

export const moveBoard = command()
	.public()
	.input(MoveBoardAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, board, x, y }, { canvases }) => {
		const moved = withMovedBoard(canvases.canvas(tabId), board, { x, y });

		if (typeof moved === "string") {
			return refuse(moved);
		}

		canvases.saveCanvas(tabId, moved.canvas, moved.reason);
		console.info(`[artboards] ${tabId}: ${moved.reason}`);
	});

export const renameBoard = command()
	.public()
	.input(RenameBoardAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, board, name }, { canvases }) => {
		const renamed = withRenamedBoard(canvases.canvas(tabId), board, name);

		if (typeof renamed === "string") {
			return refuse(renamed);
		}

		canvases.saveCanvas(tabId, renamed.canvas, renamed.reason);
		console.info(`[artboards] ${tabId}: ${renamed.reason}`);
	});

export const removeBoard = command()
	.public()
	.input(BoardAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ tabId, board }, { canvases }) => {
		const removed = withoutBoard(canvases.canvas(tabId), board);

		if (typeof removed === "string") {
			return refuse(removed);
		}

		canvases.saveCanvas(tabId, removed.canvas, removed.reason);
		console.info(`[artboards] ${tabId}: ${removed.reason}`);
	});

export const rereadBoards = subscriber(canvasesChanged).handle((_input, { invalidate }) => {
	invalidate(getBoards);
	invalidate(getShownPageBoards);
	invalidate(getBoard);
	invalidate(getBoardsMatching);
});
