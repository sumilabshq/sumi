import type { TabDrop } from "../../schema/tab-drop.schema.js";
import {
	GRID_GAP_PX,
	TILE_HEIGHT_PX,
	bottomOf,
	cellWidthOf,
	columnsOf,
	gridHeightOf,
	groupUnitOf,
	middleOf,
} from "./sidebar-layout.js";
import type { Measured, MeasuredGroup, MeasuredUnit, SidebarLayout } from "./sidebar-layout.js";

export type DragSource =
	| {
			readonly kind: "tab";
			readonly id: string;
			readonly groupId: string | null;
	  }
	| {
			readonly kind: "essential";
			readonly id: string;
			readonly at: number;
	  };

export type ListDrop = Extract<TabDrop, { kind: "list" }>;

export function dropOf(layout: SidebarLayout, source: DragSource, x: number, y: number): TabDrop {
	if (layout.list === null || y < listTopOf(layout, source)) {
		return {
			kind: "essentials",
			at: cellAtOf(layout, source, x, y),
		};
	}

	const listed = listDrop(null, null);
	return listDropOf(layout, source, y - scrollerShiftOf(layout, source, listed));
}

export function stillDropOf(layout: SidebarLayout, source: DragSource): TabDrop {
	if (source.kind === "essential") {
		return {
			kind: "essentials",
			at: source.at,
		};
	}

	const siblings = siblingIdsOf(layout, source.groupId);
	return listDrop(source.groupId, siblings[siblings.indexOf(source.id) + 1] ?? null);
}

export function isStill(layout: SidebarLayout, source: DragSource, drop: TabDrop): boolean {
	return isSameDrop(drop, stillDropOf(layout, source));
}

export function isSameDrop(one: TabDrop, other: TabDrop): boolean {
	if (one.kind === "essentials" || other.kind === "essentials") {
		return one.kind === other.kind && one.kind === "essentials" && other.kind === "essentials" && one.at === other.at;
	}

	return one.groupId === other.groupId && one.before === other.before;
}

export function isDraggedRow(source: DragSource, row: Measured): boolean {
	return source.kind === "tab" && row.id === source.id;
}

export function columnsDuring(layout: SidebarLayout, source: DragSource, drop: TabDrop): number {
	const count = layout.grid.tiles.length;
	return columnsOf(source.kind === "tab" && drop.kind === "essentials" ? count + 1 : count);
}

export function scrollerShiftOf(layout: SidebarLayout, source: DragSource, drop: TabDrop): number {
	const count = layout.grid.tiles.length;
	const next = count - (source.kind === "essential" ? 1 : 0) + (drop.kind === "essentials" ? 1 : 0);
	return gridHeightOf(next) - gridHeightOf(count);
}

function cellAtOf(layout: SidebarLayout, source: DragSource, x: number, y: number): number {
	const { grid } = layout;
	const count = grid.tiles.length - (source.kind === "essential" ? 1 : 0);
	const columns = columnsDuring(layout, source, {
		kind: "essentials",
		at: 0,
	});
	const column = Math.min(
		columns - 1,
		Math.max(0, Math.floor((x - grid.rect.left) / (cellWidthOf(grid, columns) + GRID_GAP_PX))),
	);
	const row = Math.max(0, Math.floor((y - grid.rect.top) / (TILE_HEIGHT_PX + GRID_GAP_PX)));
	return Math.min(count, row * columns + column);
}

function listTopOf(layout: SidebarLayout, source: DragSource): number {
	if (source.kind === "tab" || layout.sectionHead === null) {
		return layout.scrollerRect.top;
	}

	return middleOf(layout.sectionHead);
}

function listDropOf(layout: SidebarLayout, source: DragSource, y: number): ListDrop {
	return groupTailDropOf(layout, source, y) ?? beforeUnitDropOf(layout, source, y) ?? listDrop(null, null);
}

function groupTailDropOf(layout: SidebarLayout, source: DragSource, y: number): ListDrop | null {
	const group = layout.units.find((unit) => unit.kind === "group" && isInGroupTail(unit, source, y));
	return group === undefined ? null : listDrop(group.id, null);
}

function isInGroupTail(group: MeasuredGroup, source: DragSource, y: number): boolean {
	const rows = group.rows.filter((row) => !isDraggedRow(source, row));
	const floor = middleOf(rows.at(-1)?.rect ?? group.head);
	return y > floor && y <= bottomOf(group.rect);
}

function beforeUnitDropOf(layout: SidebarLayout, source: DragSource, y: number): ListDrop | null {
	for (const unit of layout.units) {
		if (isDraggedRow(source, unit)) {
			continue;
		}

		if (y < middleOf(unit.kind === "group" ? unit.head : unit.rect)) {
			return listDrop(null, unit.id);
		}

		const row = openRowBelowOf(unit, source, y);

		if (row !== undefined) {
			return listDrop(unit.id, row.id);
		}
	}

	return null;
}

function openRowBelowOf(unit: MeasuredUnit, source: DragSource, y: number): Measured | undefined {
	if (unit.kind !== "group" || !unit.isOpen) {
		return undefined;
	}

	return unit.rows.find((row) => !isDraggedRow(source, row) && y < middleOf(row.rect));
}

function listDrop(groupId: string | null, before: string | null): ListDrop {
	return {
		kind: "list",
		groupId,
		before,
	};
}

function siblingIdsOf(layout: SidebarLayout, groupId: string | null): readonly string[] {
	if (groupId === null) {
		return layout.units.map((unit) => unit.id);
	}

	return groupUnitOf(layout, groupId)?.rows.map((row) => row.id) ?? [];
}
