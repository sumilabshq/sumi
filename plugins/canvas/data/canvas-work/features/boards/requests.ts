import { Repeatable, refuse } from "@widgetarium/data-framework";
import { artboards } from "@sumi/artboards/contract";
import { command, query } from "#module";
import {
	BoardAskSchema,
	BoardHitSchema,
	BoardReadSchema,
	MoveBoardAskSchema,
	RenameBoardAskSchema,
	RenameLayerAskSchema,
	SearchAskSchema,
	WriteBoardAskSchema,
	WrittenBoardSchema,
} from "../../shared/schema/canvas-work.schema.js";

export const getBoard = query()
	.public()
	.metadata({
		description:
			"Read one artboard: its HTML and its layers, the element tree a person sees in the Layers panel, each with a path (0.2.1) and a name. Read it before you change an artboard, and change it by writing the whole HTML back with writeBoard.",
	})
	.input(BoardAskSchema)
	.output(BoardReadSchema)
	.handle(async (ask, { send, rendering }) => {
		const board = await send(artboards.boards.getBoard, ask);
		return {
			...board,
			layers: [...rendering.layersOf(board.html)],
		};
	});

export const writeBoard = command()
	.public()
	.metadata({
		description:
			"Draw an artboard: a whole HTML document shown in a frame on the canvas, live as soon as it is written. board null adds one (1440x900 by default, placed right of the page's others); a board id rewrites that one. A screen, a component sheet or a state each get their own artboard, named for what it shows; mark meaningful elements with data-name so the Layers panel reads well. Scripts run, but no network but fonts. Check the result with getBoardShot.",
	})
	.input(WriteBoardAskSchema)
	.output(WrittenBoardSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { send }) => send(artboards.boards.writeBoard, ask));

export const moveBoard = command()
	.public()
	.metadata({
		description: "Move an artboard on its page's canvas; x and y are its top left corner in CSS px.",
	})
	.input(MoveBoardAskSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { send }) => send(artboards.boards.moveBoard, ask));

export const renameBoard = command()
	.public()
	.metadata({ description: "Rename an artboard; the name stands above its frame and in the Layers panel." })
	.input(RenameBoardAskSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { send }) => send(artboards.boards.renameBoard, ask));

export const removeBoard = command()
	.public()
	.metadata({ description: "Remove an artboard. Ask the person before removing work they made." })
	.input(BoardAskSchema)
	.idempotencyKey(Repeatable)
	.handle((ask, { send }) => send(artboards.boards.removeBoard, ask));

export const renameLayer = command()
	.public()
	.metadata({
		description:
			"Rename a layer of an artboard: sets data-name on the element at that path, the name the Layers panel shows.",
	})
	.input(RenameLayerAskSchema)
	.idempotencyKey(Repeatable)
	.handle(async ({ canvasId, board, path, name }, { send, rendering }) => {
		const read = await send(artboards.boards.getBoard, { canvasId, board });
		const html = rendering.withLayerName(read.html, path, name);

		if (html === null) {
			return refuse(`artboard ${board} has no layer at ${path}; read its layers with getBoard`);
		}

		await send(artboards.boards.writeBoard, { canvasId, board, html });
	});

export const getBoardsMatching = query()
	.public()
	.metadata({
		description: "Find artboards in every canvas whose name or text holds the words.",
	})
	.input(SearchAskSchema)
	.output(BoardHitSchema.array())
	.handle((ask, { send }) => send(artboards.boards.getBoardsMatching, ask));
