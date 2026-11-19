import { useMemo } from "react";
import { artboards } from "@sumi/artboards/contract";
import type { CanvasRow } from "@sumi/artboards/contract";
import { navigation } from "@sumi/contract";
import { useQuery } from "@widgetarium/data-framework";
import { CANVAS_APP, HOME_ADDRESS } from "../../../shared/lib/canvas-links.js";

export interface CardChat {
	readonly id: string;
	readonly title: string | null;
}

export interface CanvasInChat {
	readonly row: CanvasRow;
	readonly chat: CardChat;
}

interface CanvasTab {
	readonly id: string;
	readonly address: string | null;
	readonly chat: CardChat | null;
}

export function useCanvasesInChats(words: string): readonly CanvasInChat[] {
	const { tabs } = useQuery(navigation.tabFacts.tabsOfApp, { app: CANVAS_APP }).data;
	const rows = useQuery(artboards.canvases.getCanvases, {}).data;
	return useMemo(() => canvasesInChatsOf(tabs, rows, words), [tabs, rows, words]);
}

function canvasesInChatsOf(
	tabs: readonly CanvasTab[],
	rows: readonly CanvasRow[],
	words: string,
): readonly CanvasInChat[] {
	const rowOf = new Map(rows.map((row) => [row.canvasId, row]));
	const wanted = words.trim().toLowerCase();
	const inChats = tabs.flatMap(({ id, address, chat }) => {
		const row = rowOf.get(address ?? id);
		const isShown = chat !== null && address !== HOME_ADDRESS && row?.title.toLowerCase().includes(wanted) === true;
		return isShown && row !== undefined ? [{ row, chat }] : [];
	});
	const firstOfEach = new Map(inChats.map((one) => [one.row.canvasId, one] as const).reverse());
	return [...firstOfEach.values()].sort((a, b) => b.row.editedAt - a.row.editedAt);
}
