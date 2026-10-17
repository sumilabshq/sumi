import type { ColumnLook, KeptColumn, TabsColumn } from "../../schema/tabs-column.schema.js";

export const ICONS_PX = 56;
const FULL_USUAL_PX = 240;
export const FULL_LEAST_PX = 200;
const FULL_MOST_PX = 420;
const FULL_FROM_PX = 140;
const HIDDEN_BELOW_PX = 32;

export const COLUMN_OPENED_ON: KeptColumn = {
	isShown: false,
	isFull: false,
	fullPx: FULL_USUAL_PX,
	side: "end",
};

export function columnOf(kept: KeptColumn): TabsColumn {
	const look = lookOf(kept);
	return {
		look,
		widthPx: widthOf(look, kept.fullPx),
		side: kept.side,
	};
}

export function columnDraggedTo(kept: KeptColumn, askedPx: number): KeptColumn {
	if (askedPx < HIDDEN_BELOW_PX) {
		return {
			...kept,
			isShown: false,
			isFull: false,
		};
	}

	if (askedPx < FULL_FROM_PX) {
		return {
			...kept,
			isShown: true,
			isFull: false,
		};
	}

	return {
		...kept,
		isShown: true,
		isFull: true,
		fullPx: Math.round(Math.min(FULL_MOST_PX, Math.max(FULL_LEAST_PX, askedPx))),
	};
}

function lookOf({ isShown, isFull }: KeptColumn): ColumnLook {
	if (!isShown) {
		return "hidden";
	}

	return isFull ? "full" : "icons";
}

function widthOf(look: ColumnLook, fullPx: number): number {
	if (look === "full") {
		return fullPx;
	}

	return look === "icons" ? ICONS_PX : 0;
}
