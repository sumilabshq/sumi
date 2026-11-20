import type { CanvasesPageAsk } from "../schema/asks.schema.js";
import type {
	Board,
	BoardHit,
	BoardPlace,
	Canvas,
	CanvasOrder,
	CanvasRow,
	CanvasView,
	CanvasesPage,
} from "../schema/canvas.schema.js";
import { boardsOnPage } from "./canvas-edits.js";

const TAG = /<[^>]*>/g;

export function canvasViewOf(canvasId: string, canvas: Canvas): CanvasView {
	return {
		canvasId,
		title: canvas.title,
		pages: canvas.pages.map((page) => ({
			...page,
			boardCount: boardsOnPage(canvas, page.id).length,
		})),
		shownPage: canvas.shownPage,
		isPanelOpen: canvas.isPanelOpen,
		panelWidth: canvas.panelWidth,
		background: canvas.background,
		camera: canvas.camera,
	};
}

export function canvasRowOf(canvasId: string, canvas: Canvas): CanvasRow {
	return {
		canvasId,
		title: canvas.title,
		pageCount: canvas.pages.length,
		boardCount: canvas.boards.length,
		editedAt: canvas.editedAt,
	};
}

export function canvasesPageOf(
	canvases: Readonly<Record<string, Canvas>>,
	{ offset, limit, order, words }: CanvasesPageAsk,
): CanvasesPage {
	const wanted = words.toLowerCase();
	const rows = Object.entries(canvases)
		.filter(([, canvas]) => canvas.title.toLowerCase().includes(wanted))
		.map(([canvasId, canvas]) => canvasRowOf(canvasId, canvas))
		.sort(ORDERS[order]);
	return {
		rows: rows.slice(offset, offset + limit),
		total: rows.length,
	};
}

const ORDERS: Readonly<Record<CanvasOrder, (a: CanvasRow, b: CanvasRow) => number>> = {
	edited: (a, b) => b.editedAt - a.editedAt || a.title.localeCompare(b.title),
	name: (a, b) => a.title.localeCompare(b.title) || b.editedAt - a.editedAt,
};

export function placeOf({ html: _html, ...place }: Board): BoardPlace {
	return place;
}

export function hitsOf(canvases: Readonly<Record<string, Canvas>>, words: string): readonly BoardHit[] {
	const wanted = words.toLowerCase();
	return Object.entries(canvases).flatMap(([canvasId, canvas]) =>
		canvas.boards
			.filter((board) => isMatching(board, wanted))
			.map((board) => ({
				canvasId,
				board: board.id,
				name: board.name,
				page: board.page,
			})),
	);
}

function isMatching(board: Board, wanted: string): boolean {
	return `${board.name} ${board.html.replace(TAG, " ")}`.toLowerCase().includes(wanted);
}
