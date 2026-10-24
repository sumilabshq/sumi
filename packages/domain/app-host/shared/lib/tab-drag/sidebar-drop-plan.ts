import type { TabDrop } from "../../schema/tab-drop.schema.js";
import {
	GRID_GAP_PX,
	TILE_HEIGHT_PX,
	bottomOf,
	cellWidthOf,
	columnsOf,
	gridHeightOf,
	groupUnitOf,
	findMeasuredList,
	listTopOf,
	middleOf,
} from "./sidebar-layout.js";
import type { Measured, MeasuredGroup, MeasuredList, MeasuredUnit, SidebarLayout } from "./sidebar-layout.js";

export type DragSource =
	| {
			readonly kind: "tab";
			readonly id: string;
			readonly groupId: string | null;
			readonly list: string;
	  }
	| {
			readonly kind: "essential";
			readonly id: string;
			readonly at: number;
	  };

export type ListDrop = Extract<TabDrop, { kind: "list" }>;

export function dropOf(layout: SidebarLayout, source: DragSource, x: number, y: number): TabDrop {
	const first = layout.lists[0];

	if (first === undefined || y < firstListDropLineOf(layout, first, source)) {
		return {
			kind: "essentials",
			at: cellAtOf(layout, source, x, y),
		};
	}

	const listedY = y - scrollerShiftOf(layout, source, listDrop(first.id, null, null));
	const list = listAtY(layout, listedY) ?? first;
	return listDropOf(list, source, listedY);
}

export function stillDropOf(layout: SidebarLayout, source: DragSource): TabDrop {
	if (source.kind === "essential") {
		return {
			kind: "essentials",
			at: source.at,
		};
	}

	const siblings = siblingIdsOf(layout, source);
	return listDrop(source.list, source.groupId, siblings[siblings.indexOf(source.id) + 1] ?? null);
}

export function isStill(layout: SidebarLayout, source: DragSource, drop: TabDrop): boolean {
	return isSameDrop(drop, stillDropOf(layout, source));
}

export function isSameDrop(one: TabDrop, other: TabDrop): boolean {
	if (one.kind === "essentials" && other.kind === "essentials") {
		return one.at === other.at;
	}

	if (one.kind !== "list" || other.kind !== "list") {
		return one.kind === other.kind;
	}

	return one.list === other.list && one.groupId === other.groupId && one.before === other.before;
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

function firstListDropLineOf(layout: SidebarLayout, first: MeasuredList, source: DragSource): number {
	if (source.kind === "tab" || first.head === null) {
		return layout.scrollerRect.top;
	}

	return middleOf(first.head.rect);
}

function listAtY(layout: SidebarLayout, y: number): MeasuredList | undefined {
	return layout.lists.filter((list) => listTopOf(list) <= y).at(-1);
}

function listDropOf(list: MeasuredList, source: DragSource, y: number): ListDrop {
	return groupTailDropOf(list, source, y) ?? beforeUnitDropOf(list, source, y) ?? listDrop(list.id, null, null);
}

function groupTailDropOf(list: MeasuredList, source: DragSource, y: number): ListDrop | null {
	const group = list.units.find((unit) => unit.kind === "group" && isInGroupTail(unit, source, y));
	return group === undefined ? null : listDrop(list.id, group.id, null);
}

function isInGroupTail(group: MeasuredGroup, source: DragSource, y: number): boolean {
	const rows = group.rows.filter((row) => !isDraggedRow(source, row));
	const floor = middleOf(rows.at(-1)?.rect ?? group.head);
	return y > floor && y <= bottomOf(group.rect);
}

function beforeUnitDropOf(list: MeasuredList, source: DragSource, y: number): ListDrop | null {
	for (const unit of list.units) {
		if (isDraggedRow(source, unit)) {
			continue;
		}

		if (y < middleOf(unit.kind === "group" ? unit.head : unit.rect)) {
			return listDrop(list.id, null, unit.id);
		}

		const row = openRowBelowOf(unit, source, y);

		if (row !== undefined) {
			return listDrop(list.id, unit.id, row.id);
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

function listDrop(list: string, groupId: string | null, before: string | null): ListDrop {
	return {
		kind: "list",
		list,
		groupId,
		before,
	};
}

function siblingIdsOf(layout: SidebarLayout, source: Extract<DragSource, { kind: "tab" }>): readonly string[] {
	if (source.groupId === null) {
		return (findMeasuredList(layout, source.list)?.units ?? []).map((unit) => unit.id);
	}

	return groupUnitOf(layout, source.groupId)?.rows.map((row) => row.id) ?? [];
}

function isDraggedRow(source: DragSource, row: Measured): boolean {
	return source.kind === "tab" && row.id === source.id;
}
