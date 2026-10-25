import type { KeptColumn, SidebarView, TabsColumn } from "../../schema/tabs-column.schema.js";

const FULL_USUAL_PX = 240;
const FULL_LEAST_PX = 200;
const FULL_MOST_PX = 420;

export const COLUMN_OPENED_ON: KeptColumn = {
	fullPx: FULL_USUAL_PX,
	side: "end",
	shutLists: [],
	hidesEmptyLists: false,
	hidesOwnWindowTabs: false,
};

export function sidebarViewOf({ hidesEmptyLists, hidesOwnWindowTabs }: KeptColumn): SidebarView {
	return {
		hidesEmptyLists,
		hidesOwnWindowTabs,
	};
}

export function columnWithView(
	kept: KeptColumn,
	view: { readonly [Option in keyof SidebarView]?: SidebarView[Option] | undefined },
): KeptColumn {
	return {
		...kept,
		hidesEmptyLists: view.hidesEmptyLists ?? kept.hidesEmptyLists,
		hidesOwnWindowTabs: view.hidesOwnWindowTabs ?? kept.hidesOwnWindowTabs,
	};
}

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

export function columnReset(kept: KeptColumn): KeptColumn {
	return columnDraggedTo(kept, FULL_USUAL_PX);
}

export function columnWithListFolded(kept: KeptColumn, list: string): KeptColumn {
	const isShut = kept.shutLists.includes(list);
	return {
		...kept,
		shutLists: isShut ? kept.shutLists.filter((one) => one !== list) : [...kept.shutLists, list],
	};
}

export function columnSaid(kept: KeptColumn): string {
	const hidden = [kept.hidesEmptyLists ? "empty lists" : "", kept.hidesOwnWindowTabs ? "own-window tabs" : ""];
	return `${kept.fullPx}px ${kept.side}, folded lists [${kept.shutLists.join(", ")}], hiding [${hidden.filter(Boolean).join(", ")}]`;
}
