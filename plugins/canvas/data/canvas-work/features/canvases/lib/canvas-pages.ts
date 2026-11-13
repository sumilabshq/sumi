export interface PlacedBoard {
	readonly id: string;
	readonly name: string;
	readonly x: number;
	readonly y: number;
	readonly w: number;
	readonly h: number;
}

export interface CanvasPages {
	readonly pages: readonly { readonly id: string; readonly name: string }[];
	readonly shownPage: string;
}

export interface CanvasPage {
	readonly id: string;
	readonly name: string;
	readonly isShown: boolean;
	readonly boards: PlacedBoard[];
}

export function canvasPagesOf(canvas: CanvasPages, boardsOfPages: readonly (readonly PlacedBoard[])[]): CanvasPage[] {
	return canvas.pages.map((page, at) => ({
		id: page.id,
		name: page.name,
		isShown: page.id === canvas.shownPage,
		boards: (boardsOfPages[at] ?? []).map(({ id, name, x, y, w, h }) => ({ id, name, x, y, w, h })),
	}));
}
