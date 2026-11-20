export interface GridView {
	readonly width: number;
	readonly top: number;
	readonly height: number;
}

export interface GridShape {
	readonly columns: number;
	readonly cardWidth: number;
	readonly cardPx: number;
	readonly rowPx: number;
}

export interface IndexSpan {
	readonly first: number;
	readonly last: number;
}

export const COLUMN_GAP_PX = 16;
export const PLAIN_CARD_PX = 200;
export const CHAT_CARD_PX = 232;

const ROW_GAP_PX = 24;
const CARD_LEAST_PX = 220;
const OVERSCAN_ROWS = 2;

export function gridShapeOf(width: number, cardPx: number): GridShape {
	const columns = Math.max(1, Math.floor((width + COLUMN_GAP_PX) / (CARD_LEAST_PX + COLUMN_GAP_PX)));
	return {
		columns,
		cardWidth: Math.max(0, (width - COLUMN_GAP_PX * (columns - 1)) / columns),
		cardPx,
		rowPx: cardPx + ROW_GAP_PX,
	};
}

export function gridHeightOf(total: number, { columns, rowPx }: GridShape): number {
	return Math.max(0, Math.ceil(total / columns) * rowPx - ROW_GAP_PX);
}

export function shownSpanOf(view: GridView, { columns, rowPx }: GridShape, total: number): IndexSpan {
	const firstRow = Math.max(0, Math.floor(view.top / rowPx) - OVERSCAN_ROWS);
	const lastRow = Math.max(0, Math.ceil((view.top + view.height) / rowPx) + OVERSCAN_ROWS);
	return {
		first: Math.min(total, firstRow * columns),
		last: Math.min(total, lastRow * columns),
	};
}

export function wantedSpanOf(shown: IndexSpan, view: GridView, { columns, rowPx }: GridShape): IndexSpan {
	return {
		first: shown.first,
		last: shown.last + Math.ceil(view.height / rowPx) * columns,
	};
}
