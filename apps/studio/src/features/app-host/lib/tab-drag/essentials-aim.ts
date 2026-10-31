import type { TabDrop } from "@widgetarium/app-host";
import type { DragSource } from "./drag-source.js";
import type { DropAim } from "./drop-aim.js";
import { GRID_GAP_PX, bottomOf, middleOf, scrolledOf } from "./sidebar-layout.js";
import type { SidebarLayout } from "./sidebar-layout.js";

const EMPTY_ESSENTIALS_BAND_PX = 16;

export function isOverEssentials(layout: SidebarLayout, source: DragSource, { y }: DropAim): boolean {
	if (source.kind === "group") {
		return false;
	}

	const { grid } = layout;

	if (grid.tiles.length === 0) {
		return y < layout.scrollerRect.top + EMPTY_ESSENTIALS_BAND_PX;
	}

	const first = layout.lists[0];
	const floor =
		source.kind === "essential" && first?.head != null
			? middleOf(first.head.rect) - scrolledOf(layout)
			: bottomOf(grid.rect) + GRID_GAP_PX / 2;
	return y < floor;
}

export function essentialsDropOf(layout: SidebarLayout, source: DragSource, { x, y }: DropAim): TabDrop {
	const { tiles } = layout.grid;
	const others = tiles.filter((tile) => tile.id !== source.id);
	const firstTop = tiles[0]?.rect.top ?? 0;
	const columns = Math.max(1, tiles.filter((tile) => tile.rect.top === firstTop).length);
	const cell = tiles[0]?.rect ?? layout.grid.rect;
	const column = clamped(Math.floor((x - layout.grid.rect.left) / (cell.width + GRID_GAP_PX)), columns - 1);
	const row = Math.max(0, Math.floor((y - layout.grid.rect.top) / (cell.height + GRID_GAP_PX)));
	return essentialsAt(Math.min(row * columns + column, others.length));
}

function essentialsAt(at: number): TabDrop {
	return {
		kind: "essentials",
		at,
	};
}

function clamped(value: number, most: number): number {
	return Math.min(most, Math.max(0, value));
}
