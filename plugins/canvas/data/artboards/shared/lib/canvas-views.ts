import type { Board, BoardHit, BoardPlace, Canvas, CanvasRow, CanvasView } from "../schema/canvas.schema.js";
import { boardsOnPage } from "./canvas-edits.js";

const TAG = /<[^>]*>/g;

export function canvasViewOf(tabId: string, canvas: Canvas): CanvasView {
	return {
		tabId,
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

export function canvasRowOf(tabId: string, canvas: Canvas): CanvasRow {
	return {
		tabId,
		title: canvas.title,
		pageCount: canvas.pages.length,
		boardCount: canvas.boards.length,
	};
}

export function placeOf({ html: _html, ...place }: Board): BoardPlace {
	return place;
}

export function hitsOf(canvases: Readonly<Record<string, Canvas>>, words: string): readonly BoardHit[] {
	const wanted = words.toLowerCase();
	return Object.entries(canvases).flatMap(([tabId, canvas]) =>
		canvas.boards
			.filter((board) => isMatching(board, wanted))
			.map((board) => ({
				tabId,
				board: board.id,
				name: board.name,
				page: board.page,
			})),
	);
}

function isMatching(board: Board, wanted: string): boolean {
	return `${board.name} ${board.html.replace(TAG, " ")}`.toLowerCase().includes(wanted);
}
