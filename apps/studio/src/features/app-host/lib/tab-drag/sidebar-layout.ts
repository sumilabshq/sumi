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

export interface MeasuredGroup extends Measured {
	readonly head: Rect;
	readonly rows: readonly Measured[];
	readonly isOpen: boolean;
}

export type MeasuredUnit = (Measured & { readonly kind: "tab" }) | (MeasuredGroup & { readonly kind: "group" });

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
	readonly rect: Rect;
	readonly head: MeasuredHead | null;
	readonly units: readonly MeasuredUnit[];
}

export interface SidebarLayout {
	readonly grid: MeasuredGrid;
	readonly scroller: HTMLElement | null;
	readonly scrollerRect: Rect;
	readonly lists: readonly MeasuredList[];
	readonly units: readonly MeasuredUnit[];
	readonly groupMargin: number;
}

export const GRID_COLUMNS = 4;
export const GRID_GAP_PX = 6;
export const TILE_HEIGHT_PX = 46;
const ROW_GAP_PX = 1;
const ROW_HEIGHT_PX = 34;

const NOWHERE: Rect = {
	left: 0,
	top: 0,
	width: 0,
	height: 0,
};

export function rectOf(element: Element): Rect {
	const box = element.getBoundingClientRect();
	return {
		left: box.left,
		top: box.top,
		width: box.width,
		height: box.height,
	};
}

export function measuredLayoutOf(holder: HTMLElement): SidebarLayout {
	const scroller = holder.querySelector<HTMLElement>("[data-host-column-scroll]");
	const lists = [...holder.querySelectorAll<HTMLElement>("[data-tabs-list]")].flatMap((element) =>
		measuredListsOf(holder, element),
	);
	const units = lists.flatMap((list) => list.units);
	return {
		grid: measuredGridOf(holder.querySelector<HTMLElement>("[data-tabs-essentials]")),
		scroller,
		scrollerRect: rectOrNullOf(scroller) ?? NOWHERE,
		lists,
		units,
		groupMargin: groupMarginOf(units),
	};
}

export function findMeasuredList(layout: SidebarLayout, id: string): MeasuredList | undefined {
	return layout.lists.find((list) => list.id === id);
}

export function listTopOf(list: MeasuredList): number {
	return list.head?.rect.top ?? list.rect.top;
}

export function rowStepOf(layout: SidebarLayout): number {
	const row = layout.units.find((unit) => unit.kind === "tab");
	return (row?.rect.height ?? ROW_HEIGHT_PX) + ROW_GAP_PX;
}

export function groupUnitOf(layout: SidebarLayout, groupId: string): MeasuredGroup | undefined {
	const unit = layout.units.find((one) => one.kind === "group" && one.id === groupId);
	return unit?.kind === "group" ? unit : undefined;
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

export function cellRectOf(grid: MeasuredGrid, at: number, columns: number): Rect {
	const width = cellWidthOf(grid, columns);
	return {
		left: grid.rect.left + (at % columns) * (width + GRID_GAP_PX),
		top: grid.rect.top + Math.floor(at / columns) * (TILE_HEIGHT_PX + GRID_GAP_PX),
		width,
		height: TILE_HEIGHT_PX,
	};
}

export function gridHeightOf(tiles: number): number {
	const rows = Math.ceil(tiles / GRID_COLUMNS);
	return rows === 0 ? 0 : rows * TILE_HEIGHT_PX + (rows - 1) * GRID_GAP_PX;
}

function measuredOf(found: Iterable<HTMLElement>): readonly Measured[] {
	return [...found].flatMap((element) => {
		const id = element.dataset["tabsId"];
		return id === undefined
			? []
			: [
					{
						id,
						element,
						rect: rectOf(element),
					},
				];
	});
}

function measuredGridOf(element: HTMLElement | null): MeasuredGrid {
	if (element === null) {
		return {
			element,
			rect: NOWHERE,
			tiles: [],
		};
	}

	return {
		element,
		rect: rectOf(element),
		tiles: measuredOf(element.querySelectorAll<HTMLElement>('[data-tabs-item="essential"]')),
	};
}

function measuredListsOf(holder: HTMLElement, element: HTMLElement): readonly MeasuredList[] {
	const id = element.dataset["tabsList"];

	if (id === undefined) {
		return [];
	}

	return [
		{
			id,
			rect: rectOf(element),
			head: measuredHeadOf(holder, id),
			units: [...element.children].flatMap((child) => unitsOf(child)),
		},
	];
}

function measuredHeadOf(holder: HTMLElement, listId: string): MeasuredHead | null {
	const head = holder.querySelector<HTMLElement>(`[data-tabs-section="${CSS.escape(listId)}"]`);

	if (head === null) {
		return null;
	}

	return {
		element: head,
		rect: rectOf(head),
	};
}

function rectOrNullOf(element: Element | null): Rect | null {
	return element === null ? null : rectOf(element);
}

function groupMarginOf(units: readonly MeasuredUnit[]): number {
	const firstBox = units.find((unit) => unit.kind === "group");

	if (firstBox === undefined) {
		return 0;
	}

	return parseFloat(getComputedStyle(firstBox.element).marginTop) || 0;
}

function unitsOf(child: Element): readonly MeasuredUnit[] {
	if (!(child instanceof HTMLElement)) {
		return [];
	}

	const boxId = child.dataset["tabsBox"];

	if (boxId === undefined) {
		return measuredOf([child]).map((row) => ({
			...row,
			kind: "tab",
		}));
	}

	return [measuredGroupOf(child, boxId)];
}

function measuredGroupOf(box: HTMLElement, id: string): MeasuredUnit {
	const head = box.querySelector<HTMLElement>('[data-tabs-item="group"]');
	return {
		kind: "group",
		id,
		element: box,
		rect: rectOf(box),
		head: rectOf(head ?? box),
		rows: measuredOf(box.querySelectorAll<HTMLElement>('[data-tabs-item="tab"]')),
		isOpen: head?.getAttribute("aria-expanded") === "true",
	};
}
