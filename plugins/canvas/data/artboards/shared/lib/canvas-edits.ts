import type { WriteBoardAsk } from "../schema/asks.schema.js";
import type { Board, Canvas, Page } from "../schema/canvas.schema.js";

export const FIRST_PAGE_NAME = "Untitled page";
export const FIRST_CANVAS_TITLE = "Untitled canvas";

const FIRST_PAGE: Page = {
	id: "page-1",
	name: FIRST_PAGE_NAME,
};
export const PANEL_WIDTH = 240;
const BOARD_W = 1440;
const BOARD_H = 900;
const BOARD_GAP = 80;

export interface EditDone<Id> {
	readonly canvas: Canvas;
	readonly id: Id;
	readonly reason: string;
}

export type EditOrRefusal<Id> = EditDone<Id> | string;

export function createEmptyCanvas(): Canvas {
	return {
		title: FIRST_CANVAS_TITLE,
		pages: [FIRST_PAGE],
		boards: [],
		shownPage: FIRST_PAGE.id,
		isPanelOpen: true,
		panelWidth: PANEL_WIDTH,
		camera: null,
	};
}

export function pageOf(canvas: Canvas, page: string): Page | null {
	return canvas.pages.find(({ id }) => id === page) ?? null;
}

export function boardOf(canvas: Canvas, board: string): Board | null {
	return canvas.boards.find(({ id }) => id === board) ?? null;
}

export function boardsOnPage(canvas: Canvas, page: string): readonly Board[] {
	return canvas.boards.filter((board) => board.page === page);
}

export function withAddedPage(canvas: Canvas, name: string | null): EditDone<string> {
	const page = {
		id: nextIdOf(canvas.pages, "page"),
		name: name ?? `Page ${canvas.pages.length + 1}`,
	};
	const pages = [...canvas.pages, page];
	return {
		canvas: { ...canvas, pages, shownPage: page.id },
		id: page.id,
		reason: `page "${page.name}" added and shown`,
	};
}

export function withRenamedPage(canvas: Canvas, page: string, name: string): EditOrRefusal<string> {
	const was = pageOf(canvas, page);

	if (was === null) {
		return missingPageReason(page);
	}

	const pages = canvas.pages.map((one) => (one.id === page ? { ...one, name } : one));
	return {
		canvas: { ...canvas, pages },
		id: page,
		reason: `page "${was.name}" → "${name}"`,
	};
}

export function withoutPage(canvas: Canvas, page: string): EditOrRefusal<string> {
	const was = pageOf(canvas, page);

	if (was === null) {
		return missingPageReason(page);
	}

	const left = canvas.pages.filter(({ id }) => id !== page);

	if (left.length === 0) {
		return `page "${was.name}" is the canvas's only page; add another before removing it`;
	}

	return {
		canvas: pageRemovedFrom(canvas, page, left),
		id: page,
		reason: `page "${was.name}" removed with its ${boardsOnPage(canvas, page).length} artboards`,
	};
}

function pageRemovedFrom(canvas: Canvas, page: string, left: readonly Page[]): Canvas {
	const shownPage = canvas.shownPage === page ? (left[0]?.id ?? FIRST_PAGE.id) : canvas.shownPage;
	const boards = canvas.boards.filter((board) => board.page !== page);
	return { ...canvas, pages: [...left], boards, shownPage };
}

export function withShownPage(canvas: Canvas, page: string): EditOrRefusal<string> {
	if (pageOf(canvas, page) === null) {
		return missingPageReason(page);
	}

	return {
		canvas: { ...canvas, shownPage: page },
		id: page,
		reason: `shown page ${canvas.shownPage} → ${page}`,
	};
}

export function withWrittenBoard(canvas: Canvas, ask: WriteBoardAsk): EditOrRefusal<Board> {
	const was = ask.board === null ? null : boardOf(canvas, ask.board);
	const page = ask.page ?? was?.page ?? canvas.shownPage;

	if (pageOf(canvas, page) === null) {
		return missingPageReason(page);
	}

	if (was !== null) {
		return rewriteBoard(canvas, { ...rewrittenBoardOf(was, ask), page });
	}

	return addBoard(canvas, newBoardOf(canvas, ask, page));
}

function rewrittenBoardOf(was: Board, ask: WriteBoardAsk): Board {
	return {
		...was,
		name: ask.name ?? was.name,
		x: ask.x ?? was.x,
		y: ask.y ?? was.y,
		w: ask.w ?? was.w,
		h: ask.h ?? was.h,
		html: ask.html,
	};
}

function newBoardOf(canvas: Canvas, ask: WriteBoardAsk, page: string): Board {
	return {
		id: ask.board ?? nextIdOf(canvas.boards, "board"),
		page,
		name: ask.name ?? `Artboard ${canvas.boards.length + 1}`,
		...newPlaceOf(boardsOnPage(canvas, page), ask),
		html: ask.html,
	};
}

function newPlaceOf(neighbours: readonly Board[], ask: WriteBoardAsk): Pick<Board, "x" | "y" | "w" | "h"> {
	return {
		x: ask.x ?? nextXOf(neighbours),
		y: ask.y ?? neighbours[0]?.y ?? 0,
		w: ask.w ?? BOARD_W,
		h: ask.h ?? BOARD_H,
	};
}

function rewriteBoard(canvas: Canvas, board: Board): EditDone<Board> {
	return {
		canvas: replacedBoard(canvas, board),
		id: board,
		reason: `artboard "${board.name}" rewritten (${board.html.length} chars)`,
	};
}

function addBoard(canvas: Canvas, board: Board): EditDone<Board> {
	return {
		canvas: { ...canvas, boards: [...canvas.boards, board] },
		id: board,
		reason: `artboard "${board.name}" added on ${board.page} at ${board.x},${board.y}`,
	};
}

export function withMovedBoard(
	canvas: Canvas,
	board: string,
	to: { readonly x: number; readonly y: number },
): EditOrRefusal<string> {
	const was = boardOf(canvas, board);

	if (was === null) {
		return missingBoardReason(board);
	}

	return {
		canvas: replacedBoard(canvas, { ...was, ...to }),
		id: board,
		reason: `artboard "${was.name}" ${was.x},${was.y} → ${to.x},${to.y}`,
	};
}

export function withRenamedBoard(canvas: Canvas, board: string, name: string): EditOrRefusal<string> {
	const was = boardOf(canvas, board);

	if (was === null) {
		return missingBoardReason(board);
	}

	return {
		canvas: replacedBoard(canvas, { ...was, name }),
		id: board,
		reason: `artboard "${was.name}" → "${name}"`,
	};
}

export function withoutBoard(canvas: Canvas, board: string): EditOrRefusal<string> {
	const was = boardOf(canvas, board);

	if (was === null) {
		return missingBoardReason(board);
	}

	const boards = canvas.boards.filter(({ id }) => id !== board);
	return {
		canvas: { ...canvas, boards },
		id: board,
		reason: `artboard "${was.name}" removed`,
	};
}

function replacedBoard(canvas: Canvas, board: Board): Canvas {
	const boards = canvas.boards.map((one) => (one.id === board.id ? board : one));
	return { ...canvas, boards };
}

function nextIdOf(items: readonly { readonly id: string }[], kind: string): string {
	const taken = new Set(items.map(({ id }) => id));
	const free = Array.from({ length: items.length + 1 }, (_, at) => `${kind}-${items.length + 1 + at}`);
	return free.find((id) => !taken.has(id)) ?? `${kind}-${items.length + 1}`;
}

function nextXOf(boards: readonly Board[]): number {
	if (boards.length === 0) {
		return 0;
	}

	return Math.max(...boards.map(({ x, w }) => x + w)) + BOARD_GAP;
}

function missingPageReason(page: string): string {
	return `the canvas has no page ${page}; read it with getCanvas for its page ids`;
}

function missingBoardReason(board: string): string {
	return `the canvas has no artboard ${board}; list them with getBoards`;
}
