import type { TabDrop } from "@widgetarium/app-host";
import type { DragSource } from "./drag-source.js";
import { splitUnitOf } from "./sidebar-layout.js";
import type { Measured, Rect, SidebarLayout } from "./sidebar-layout.js";

export function placeholderRectOf(layout: SidebarLayout, source: DragSource, drop: TabDrop): Rect | null {
	const tile = layout.grid.tiles.find((one) => one.id === source.id);

	if (tile !== undefined) {
		return tile.rect;
	}

	const splitId = liftedSplitIdOf(source, drop);
	const rows = splitId === null ? unsplitRowsOf(layout) : (splitUnitOf(layout, splitId)?.parts ?? []);
	return rows.find((one) => one.id === source.id)?.rect ?? null;
}

export function liftedSplitIdOf(source: DragSource, drop: TabDrop): string | null {
	if (drop.kind === "split") {
		return drop.splitId;
	}

	return drop.kind === "own-window" && source.kind === "tab" ? source.splitId : null;
}

export function isDraggedRow(source: DragSource, row: { readonly id: string | null }): boolean {
	return source.kind !== "essential" && row.id === source.id;
}

function unsplitRowsOf(layout: SidebarLayout): readonly Measured[] {
	return layout.units.flatMap((unit): readonly Measured[] => {
		if (unit.kind === "group") {
			return [unit, ...unit.rows];
		}

		return unit.kind === "split" ? [] : [unit];
	});
}
