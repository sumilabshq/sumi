export interface Rect {
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly height: number;
}

export interface Measured {
	readonly id: string;
	readonly element: HTMLElement;
	readonly rect: Rect;
}

export interface MeasuredRow extends Measured {
	readonly isChat: boolean;
	readonly isFolded: boolean;
	readonly cardRect: Rect;
}

export interface MeasuredGroup extends Measured {
	readonly head: Rect;
	readonly rows: readonly MeasuredRow[];
	readonly isOpen: boolean;
	readonly holdsChat: boolean;
}

export interface MeasuredPart {
	readonly id: string | null;
	readonly element: HTMLElement;
	readonly rect: Rect;
}

export interface MeasuredSplit extends Measured {
	readonly anchorId: string;
	readonly parts: readonly MeasuredPart[];
	readonly members: Rect;
	readonly isOpen: boolean;
}

export type MeasuredUnit =
	| (MeasuredRow & { readonly kind: "tab" })
	| (MeasuredGroup & { readonly kind: "group" })
	| (MeasuredSplit & { readonly kind: "split" });

export interface MeasuredGrid {
	readonly element: HTMLElement | null;
	readonly rect: Rect;
	readonly tiles: readonly Measured[];
}

export interface MeasuredHead {
	readonly element: HTMLElement;
	readonly rect: Rect;
}

export interface MeasuredList {
	readonly id: string;
	readonly isNested: boolean;
	readonly rect: Rect;
	readonly head: MeasuredHead | null;
	readonly units: readonly MeasuredUnit[];
}

export interface SidebarLayout {
	readonly grid: MeasuredGrid;
	readonly scroller: HTMLElement | null;
	readonly scrollerRect: Rect;
	readonly scrollTop: number;
	readonly lists: readonly MeasuredList[];
	readonly units: readonly MeasuredUnit[];
}

const GRID_COLUMNS = 4;
export const GRID_GAP_PX = 6;
export const TILE_HEIGHT_PX = 46;
const ROW_GAP_PX = 1;
const ROW_HEIGHT_PX = 34;

export function findMeasuredList(layout: SidebarLayout, id: string): MeasuredList | undefined {
	return layout.lists.find((list) => list.id === id);
}

export function listTopOf(list: MeasuredList): number {
	return list.head?.rect.top ?? list.rect.top;
}

export function scrolledOf(layout: SidebarLayout): number {
	return (layout.scroller?.scrollTop ?? 0) - layout.scrollTop;
}

export function splitUnitOf(layout: SidebarLayout, splitId: string): MeasuredSplit | undefined {
	const unit = layout.units.find((one) => one.kind === "split" && one.id === splitId);
	return unit?.kind === "split" ? unit : undefined;
}

export function memberIdsOf(split: MeasuredSplit | undefined): readonly string[] {
	return split?.parts.flatMap((part) => (part.id === null ? [] : [part.id])) ?? [];
}

export function rowStepOf(layout: SidebarLayout): number {
	const row = layout.units.find((unit) => unit.kind === "tab");
	return (row?.rect.height ?? ROW_HEIGHT_PX) + ROW_GAP_PX;
}

export function groupUnitOf(layout: SidebarLayout, groupId: string): MeasuredGroup | undefined {
	const unit = layout.units.find((one) => one.kind === "group" && one.id === groupId);
	return unit?.kind === "group" ? unit : undefined;
}

export function chatRowsOf(list: MeasuredList): readonly MeasuredRow[] {
	const rows = list.units.flatMap((unit) => {
		if (unit.kind === "tab") {
			return [unit];
		}

		return unit.kind === "group" && unit.isOpen ? unit.rows : [];
	});
	return rows.filter((row) => row.isChat);
}

export function allChatRowsOf(layout: SidebarLayout): readonly MeasuredRow[] {
	return layout.lists.flatMap((list) => chatRowsOf(list));
}

export function chatRowOf(layout: SidebarLayout, id: string): MeasuredRow | undefined {
	return allChatRowsOf(layout).find((row) => row.id === id);
}

export function bottomOf(rect: Rect): number {
	return rect.top + rect.height;
}

export function middleOf(rect: Rect): number {
	return rect.top + rect.height / 2;
}

export function columnsOf(tiles: number): number {
	return Math.min(GRID_COLUMNS, Math.max(1, tiles));
}

export function cellWidthOf(grid: MeasuredGrid, columns: number): number {
	return (grid.rect.width - GRID_GAP_PX * (columns - 1)) / columns;
}
