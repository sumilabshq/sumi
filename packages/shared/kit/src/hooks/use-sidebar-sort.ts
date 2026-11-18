import { useEffect, useRef, useState } from "react";
import type { MutableRefObject, PointerEvent } from "react";

export type SidebarSortPlace = "before" | "after" | "into";

export interface SidebarSortAim {
	readonly targetId: string;
	readonly place: SidebarSortPlace;
	readonly levels: number;
}

export interface SidebarSortDrop extends SidebarSortAim {
	readonly id: string;
}

export interface SidebarSortOutside {
	readonly id: string;
	readonly x: number;
	readonly y: number;
}

export interface SidebarSorting {
	readonly id: string;
	readonly left: number;
	readonly top: number;
	readonly width: number;
	readonly aim: SidebarSortAim | null;
	readonly outside: SidebarSortOutside | null;
}

export interface SidebarSortListeners {
	readonly levelPx?: number;
	onDrop(drop: SidebarSortDrop): void;
	onDropOutside?(outside: SidebarSortOutside): void;
}

export interface SidebarSort {
	readonly sorting: SidebarSorting | null;
	readonly onPointerDown: (event: PointerEvent<HTMLElement>) => void;
}

interface FrozenRow {
	readonly id: string;
	readonly top: number;
	readonly bottom: number;
	readonly isInto: boolean;
}

interface Grab {
	readonly id: string;
	readonly pointerId: number;
	readonly source: HTMLElement;
	readonly root: HTMLElement;
	readonly rows: readonly FrozenRow[];
	readonly scrollTop: number;
	readonly fromX: number;
	readonly fromY: number;
	readonly offsetX: number;
	readonly offsetY: number;
	readonly width: number;
	readonly levelPx: number | null;
}

type SetSorting = (sorting: SidebarSorting | null) => void;

const SORT_ITEM = "[data-sort-id]";
const SORT_SKIP = "[data-sort-skip]";
const SORT_FIXED = "data-sort-fixed";
const SORT_INTO = "data-sort-into";
const SORT_BLOCK = "data-sort-block";
const PRIMARY_BUTTON = 0;
const PULL_PX = 6;
const EDGE_SHARE = 0.25;
const HALF = 0.5;
const ESCAPE = "Escape";

export function useSidebarSort(listeners: SidebarSortListeners): SidebarSort {
	const [sorting, setSorting] = useState<SidebarSorting | null>(null);
	const latest = useRef(listeners);
	latest.current = listeners;
	const ending = useRef<AbortController | null>(null);
	useEffect(() => () => ending.current?.abort(), []);
	return {
		sorting,
		onPointerDown: (event) => {
			const grab = grabOf(event, listeners.levelPx ?? null);

			if (grab === null) {
				return;
			}

			ending.current?.abort();
			ending.current = new AbortController();
			followGrab(grab, ending.current, latest, setSorting);
		},
	};
}

function grabOf(event: PointerEvent<HTMLElement>, levelPx: number | null): Grab | null {
	const { target } = event;

	if (event.button !== PRIMARY_BUTTON || !(target instanceof Element) || target.closest(SORT_SKIP) !== null) {
		return null;
	}

	const source = target.closest<HTMLElement>(SORT_ITEM);
	const id = source?.getAttribute("data-sort-id") ?? null;

	if (source === null || id === null || source.hasAttribute(SORT_FIXED) || !event.currentTarget.contains(source)) {
		return null;
	}

	const block = blockOf(source, id);
	const box = block.getBoundingClientRect();
	return {
		id,
		pointerId: event.pointerId,
		source,
		root: event.currentTarget,
		rows: frozenRowsOf(event.currentTarget, block, box),
		scrollTop: event.currentTarget.scrollTop,
		fromX: event.clientX,
		fromY: event.clientY,
		offsetX: event.clientX - box.left,
		offsetY: event.clientY - box.top,
		width: box.width,
		levelPx,
	};
}

function blockOf(source: HTMLElement, id: string): HTMLElement {
	const block = source.closest<HTMLElement>(`[${SORT_BLOCK}]`);
	return block !== null && block.getAttribute(SORT_BLOCK) === id ? block : source;
}

function followGrab(
	grab: Grab,
	ending: AbortController,
	latest: MutableRefObject<SidebarSortListeners>,
	setSorting: SetSorting,
): void {
	const held = {
		now: null as SidebarSorting | null,
		frame: null as number | null,
		pointer: null as globalThis.PointerEvent | null,
	};
	const paint = (): void => {
		held.frame = null;

		if (held.pointer !== null) {
			held.now = sortingAt(grab, held.pointer, held.now?.aim ?? null);
			setSorting(held.now);
		}
	};
	const move = (pointer: globalThis.PointerEvent): void => {
		if (pointer.pointerId !== grab.pointerId) {
			return;
		}

		if (held.now === null && Math.hypot(pointer.clientX - grab.fromX, pointer.clientY - grab.fromY) < PULL_PX) {
			return;
		}

		if (held.pointer === null && grab.source.isConnected) {
			grab.source.setPointerCapture(grab.pointerId);
		}

		held.pointer = pointer;
		held.frame ??= requestAnimationFrame(paint);
	};
	const end = (isPlaced: boolean): void => {
		ending.abort();

		if (held.frame !== null) {
			cancelAnimationFrame(held.frame);
			paint();
		}

		const last = held.now;
		setSorting(null);

		if (last === null || (last.aim === null && last.outside === null)) {
			return;
		}

		swallowNextClick();

		if (!isPlaced) {
			return;
		}

		if (last.outside !== null) {
			latest.current.onDropOutside?.(last.outside);
			return;
		}

		if (last.aim !== null) {
			latest.current.onDrop({
				id: grab.id,
				...last.aim,
			});
		}
	};
	const { signal } = ending;
	window.addEventListener("pointermove", move, { signal });
	window.addEventListener("pointerup", (pointer) => pointer.pointerId === grab.pointerId && end(true), { signal });
	window.addEventListener("pointercancel", (pointer) => pointer.pointerId === grab.pointerId && end(false), { signal });
	window.addEventListener(
		"keydown",
		(key) => {
			if (key.key === ESCAPE) {
				end(false);
			}
		},
		{ signal },
	);
}

function sortingAt(grab: Grab, pointer: globalThis.PointerEvent, aimWas: SidebarSortAim | null): SidebarSorting {
	const isOver = isInside(grab.root.getBoundingClientRect(), pointer);
	return {
		id: grab.id,
		left: pointer.clientX - grab.offsetX,
		top: pointer.clientY - grab.offsetY,
		width: grab.width,
		aim: isOver ? aimAt(grab, pointer, aimWas) : null,
		outside: isOver
			? null
			: {
					id: grab.id,
					x: pointer.clientX,
					y: pointer.clientY,
				},
	};
}

function frozenRowsOf(root: HTMLElement, block: HTMLElement, lifted: DOMRect): readonly FrozenRow[] {
	return [...root.querySelectorAll<HTMLElement>(SORT_ITEM)].flatMap((row) => {
		const rowId = row.getAttribute("data-sort-id");

		if (rowId === null || block.contains(row)) {
			return [];
		}

		const box = row.getBoundingClientRect();
		const shift = box.top >= lifted.bottom ? lifted.height : 0;
		return [
			{
				id: rowId,
				top: box.top - shift,
				bottom: box.bottom - shift,
				isInto: row.hasAttribute(SORT_INTO),
			},
		];
	});
}

function aimAt(grab: Grab, pointer: globalThis.PointerEvent, was: SidebarSortAim | null): SidebarSortAim | null {
	const at = pointer.clientY + grab.root.scrollTop - grab.scrollTop;
	const spot = spotAt(grab.rows, at);

	if (spot === null) {
		return was;
	}

	const levels = grab.levelPx === null ? 0 : Math.round((pointer.clientX - grab.fromX) / grab.levelPx);
	const isSame = was !== null && was.targetId === spot.targetId && was.place === spot.place && was.levels === levels;
	return isSame
		? was
		: {
				...spot,
				levels,
			};
}

function spotAt(rows: readonly FrozenRow[], at: number): Omit<SidebarSortAim, "levels"> | null {
	const row = rows.find((one) => at >= one.top && at < one.bottom);

	if (row !== undefined) {
		return spotIn(row, at);
	}

	const first = rows[0];
	const last = rows.at(-1);

	if (first === undefined || last === undefined) {
		return null;
	}

	if (at < first.top) {
		return {
			targetId: first.id,
			place: "before",
		};
	}

	return at >= last.bottom
		? {
				targetId: last.id,
				place: "after",
			}
		: null;
}

function spotIn(row: FrozenRow, at: number): Omit<SidebarSortAim, "levels"> {
	const share = (at - row.top) / (row.bottom - row.top);

	if (row.isInto && share > EDGE_SHARE && share < 1 - EDGE_SHARE) {
		return {
			targetId: row.id,
			place: "into",
		};
	}

	return {
		targetId: row.id,
		place: share < HALF ? "before" : "after",
	};
}

function isInside(box: DOMRect, pointer: globalThis.PointerEvent): boolean {
	return pointer.clientX >= box.left && pointer.clientX < box.right && pointer.clientY >= box.top && pointer.clientY < box.bottom;
}

function swallowNextClick(): void {
	const swallow = (click: MouseEvent): void => {
		click.stopPropagation();
		click.preventDefault();
	};
	window.addEventListener("click", swallow, {
		capture: true,
		once: true,
	});
	setTimeout(() => window.removeEventListener("click", swallow, { capture: true }));
}
