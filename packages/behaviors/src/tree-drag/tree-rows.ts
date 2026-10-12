import { shownTopOf } from "./projected-drop.js";
import type { DragRow, Projection } from "./projected-drop.js";

export interface TreeRowMarks {
	readonly id: string;
	readonly depth: number;
	readonly canHold: boolean;
	readonly isHeld: boolean;
	readonly scope: string;
}

export interface DropSlot {
	readonly top: number;
	readonly left: number;
	readonly height: number;
}

export interface Lift {
	readonly id: string;
	readonly startX: number;
	readonly startY: number;
	rows: readonly DragRow[];
	elements: ReadonlyMap<string, HTMLElement>;
	grab: number;
	projection: Projection | null;
}

export const TREE_ROW = "data-tree-row";
const ROW = `[${TREE_ROW}]`;
const CLOSED = '[data-state="closed"]';
const DRAGGING = "data-dragging";
const LIFTED = "data-lifted";

export function treeRowProps(row: TreeRowMarks): Readonly<Record<string, string>> {
	return {
		[TREE_ROW]: "",
		"data-tree-id": row.id,
		"data-tree-depth": String(row.depth),
		"data-tree-can-hold": String(row.canHold),
		"data-tree-held": String(row.isHeld),
		"data-tree-scope": row.scope,
	};
}

export function contentY(holder: HTMLElement, clientY: number): number {
	return clientY - holder.getBoundingClientRect().top + holder.scrollTop;
}

export function liftStarted(holder: HTMLElement, held: Lift): void {
	const shown = [...holder.querySelectorAll<HTMLElement>(ROW)].filter((row) => !row.closest(CLOSED));
	held.rows = shown.map((row) => ({
		mark: row.dataset["treeId"] ?? "",
		depth: Number(row.dataset["treeDepth"] ?? 0),
		top: contentY(holder, row.getBoundingClientRect().top),
		height: row.offsetHeight,
		canHold: row.dataset["treeCanHold"] === "true",
		isHeld: row.dataset["treeHeld"] === "true",
		scope: row.dataset["treeScope"] ?? "",
	}));
	held.elements = new Map(shown.map((row) => [row.dataset["treeId"] ?? "", row]));
	const lifted = held.rows.find((row) => row.mark === held.id);
	held.grab = contentY(holder, held.startY) - (lifted?.top ?? 0);
	holder.setAttribute(DRAGGING, "");
}

export function liftMoved(held: Lift, projection: Projection | null, offset: number): DropSlot | null | undefined {
	const block = new Set(projection?.block ?? [held.id]);
	for (const mark of block) {
		const element = held.elements.get(mark);
		element?.setAttribute(LIFTED, "");
		if (element) element.style.transform = `translateY(${offset}px)`;
	}
	const isSame = projection?.at === held.projection?.at && projection?.depth === held.projection?.depth;
	held.projection = projection;
	if (isSame) return undefined;
	if (!projection) {
		for (const [mark, element] of held.elements) if (!block.has(mark)) element.style.transform = "";
		return null;
	}
	const from = held.rows.findIndex((row) => row.mark === held.id);
	const shift = { from, blockHeight: projection.blockHeight, at: projection.at };
	held.rows
		.filter((row) => !block.has(row.mark))
		.forEach((row, index) => {
			const element = held.elements.get(row.mark);
			if (element) element.style.transform = `translateY(${shownTopOf(row, index, shift) - row.top}px)`;
		});
	return { top: projection.slotTop, left: projection.depth, height: projection.blockHeight };
}

export function liftLanded(held: Lift, projection: Projection): void {
	let inside = 0;
	for (const mark of projection.block) {
		const element = held.elements.get(mark);
		const row = held.rows.find((one) => one.mark === mark);
		if (!element || !row) continue;
		element.removeAttribute(LIFTED);
		element.style.transform = `translateY(${projection.slotTop + inside - row.top}px)`;
		inside += row.height;
	}
}

export function liftCleared(holder: HTMLElement): void {
	holder.removeAttribute(DRAGGING);
	for (const row of holder.querySelectorAll<HTMLElement>(ROW)) {
		row.removeAttribute(LIFTED);
		row.style.transform = "";
	}
}
