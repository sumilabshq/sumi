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
	.handle(({ canvasId, page }, { canvases }) => {
		const canvas = canvases.canvas(canvasId);
		return boardsOnPage(canvas, page ?? canvas.shownPage).map(placeOf);
	});

export const getShownPageBoards = query()
	.public()
	.input(CanvasAskSchema)
	.output(BoardSchema.array())
	.handle(({ canvasId }, { canvases }) => {
		const canvas = canvases.canvas(canvasId);
		return [...boardsOnPage(canvas, canvas.shownPage)];
	});

export const getPageBoards = query()
	.public()
	.input(BoardsAskSchema)
	.output(BoardSchema.array())
	.handle(({ canvasId, page }, { canvases }) => {
		const canvas = canvases.canvas(canvasId);
		return [...boardsOnPage(canvas, page ?? canvas.shownPage)];
	});

export const getBoard = query()
	.public()
	.input(BoardAskSchema)
	.output(BoardSchema)
	.handle(({ canvasId, board }, { canvases }) => {
		const found = boardOf(canvases.canvas(canvasId), board);
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
		const written = withWrittenBoard(canvases.canvas(ask.canvasId), ask);

		if (typeof written === "string") {
			return refuse(written);
		}

		canvases.saveCanvas(ask.canvasId, written.canvas, written.reason);
		console.info(`[artboards] ${ask.canvasId}: ${written.reason}`);
		return {
			board: written.id.id,
			page: written.id.page,
		};
	});

export const moveBoard = command()
	.public()
	.input(MoveBoardAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, board, x, y }, { canvases }) => {
		const moved = withMovedBoard(canvases.canvas(canvasId), board, { x, y });

		if (typeof moved === "string") {
			return refuse(moved);
		}

		canvases.saveCanvas(canvasId, moved.canvas, moved.reason);
		console.info(`[artboards] ${canvasId}: ${moved.reason}`);
	});

export const renameBoard = command()
	.public()
	.input(RenameBoardAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, board, name }, { canvases }) => {
		const renamed = withRenamedBoard(canvases.canvas(canvasId), board, name);

		if (typeof renamed === "string") {
			return refuse(renamed);
		}

		canvases.saveCanvas(canvasId, renamed.canvas, renamed.reason);
		console.info(`[artboards] ${canvasId}: ${renamed.reason}`);
	});

export const removeBoard = command()
	.public()
	.input(BoardAskSchema)
	.idempotencyKey(Repeatable)
	.handle(({ canvasId, board }, { canvases }) => {
		const removed = withoutBoard(canvases.canvas(canvasId), board);

		if (typeof removed === "string") {
			return refuse(removed);
		}

		canvases.saveCanvas(canvasId, removed.canvas, removed.reason);
		console.info(`[artboards] ${canvasId}: ${removed.reason}`);
	});

export const rereadBoards = subscriber(canvasesChanged).handle((_input, { invalidate }) => {
	invalidate(getBoards);
	invalidate(getShownPageBoards);
	invalidate(getBoard);
	invalidate(getBoardsMatching);
});
