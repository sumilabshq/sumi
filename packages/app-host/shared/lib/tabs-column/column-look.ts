import type { KeptColumn, TabsColumn } from "../../schema/tabs-column.schema.js";

export const FULL_USUAL_PX = 240;
const FULL_LEAST_PX = 200;
const FULL_MOST_PX = 420;

export const COLUMN_OPENED_ON: KeptColumn = {
	fullPx: FULL_USUAL_PX,
	side: "end",
	isListOpen: true,
};

export function columnOf(kept: KeptColumn): TabsColumn {
	return {
		widthPx: kept.fullPx,
		side: kept.side,
	};
}

export function columnDraggedTo(kept: KeptColumn, askedPx: number): KeptColumn {
	return {
		...kept,
		fullPx: Math.round(Math.min(FULL_MOST_PX, Math.max(FULL_LEAST_PX, askedPx))),
	};
}
