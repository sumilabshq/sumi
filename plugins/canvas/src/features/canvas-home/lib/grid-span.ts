export interface GridView {
	readonly width: number;
	readonly top: number;
	readonly height: number;
}

export interface GridShape {
	readonly columns: number;
	readonly cardWidth: number;
}

export interface IndexSpan {
	readonly first: number;
	readonly last: number;
}

export const GAP_PX = 16;
export const CARD_PX = 228;
export const ROW_PX = CARD_PX + GAP_PX;

const CARD_LEAST_PX = 220;
const OVERSCAN_ROWS = 2;

export function gridShapeOf(width: number): GridShape {
	const columns = Math.max(1, Math.floor((width + GAP_PX) / (CARD_LEAST_PX + GAP_PX)));
	return {
		columns,
		cardWidth: Math.max(0, (width - GAP_PX * (columns - 1)) / columns),
	};
}

export function gridHeightOf(total: number, { columns }: GridShape): number {
	return Math.max(0, Math.ceil(total / columns) * ROW_PX - GAP_PX);
}

export function shownSpanOf(view: GridView, { columns }: GridShape, total: number): IndexSpan {
	const firstRow = Math.max(0, Math.floor(view.top / ROW_PX) - OVERSCAN_ROWS);
	const lastRow = Math.max(0, Math.ceil((view.top + view.height) / ROW_PX) + OVERSCAN_ROWS);
	return {
		first: Math.min(total, firstRow * columns),
		last: Math.min(total, lastRow * columns),
	};
}

export function wantedSpanOf(shown: IndexSpan, view: GridView, { columns }: GridShape): IndexSpan {
	return {
		first: shown.first,
		last: shown.last + Math.ceil(view.height / ROW_PX) * columns,
	};
}
