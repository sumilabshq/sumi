import type { TabDrop } from "../../schema/tab-drop.schema.js";
import type { Shifts } from "./drop-shifts.js";
import { isDraggedRow } from "./sidebar-drop-plan.js";
import type { DragSource } from "./sidebar-drop-plan.js";
import {
	ROW_GAP_PX,
	ROW_HEIGHT_PX,
	bottomOf,
	cellRectOf,
	groupUnitOf,
	listRectOf,
	rowStepOf,
} from "./sidebar-layout.js";
import type { Measured, MeasuredGroup, MeasuredUnit, Rect, SidebarLayout } from "./sidebar-layout.js";

export function landingOf(layout: SidebarLayout, source: DragSource, drop: TabDrop, shifts: Shifts): Rect {
	if (drop.kind === "essentials") {
		return cellRectOf(layout.grid, drop.at, shifts.columns);
	}

	const landing = new ListLanding(layout, source, shifts);
	const group = drop.groupId === null ? undefined : groupUnitOf(layout, drop.groupId);
	return group === undefined ? landing.inList(drop.before) : landing.inGroup(group, drop.before);
}

class ListLanding {
	private readonly step: number;

	constructor(
		private readonly layout: SidebarLayout,
		private readonly source: DragSource,
		private readonly shifts: Shifts,
	) {
		this.step = rowStepOf(layout);
	}

	inGroup(group: MeasuredGroup, beforeId: string | null): Rect {
		const rows = group.rows.filter((row) => !isDraggedRow(this.source, row));
		const before = rows.find((row) => row.id === beforeId);
		const top =
			before === undefined
				? this.groupTailTopOf(group, rows)
				: before.rect.top + this.shiftOf(group.element) + this.shiftOf(before.element) - this.step;
		return rowRectAt(group.head, top);
	}

	inList(beforeId: string | null): Rect {
		const units = this.layout.units.filter((unit) => !isDraggedRow(this.source, unit));
		const before = units.find((unit) => unit.id === beforeId);
		const top = before === undefined ? this.listTailTopOf(units) : this.topBefore(before);
		return rowRectAt(listRectOf(this.layout), top);
	}

	private groupTailTopOf(group: MeasuredGroup, rows: readonly Measured[]): number {
		const last = rows.at(-1);
		const bottom = last === undefined ? bottomOf(group.head) : bottomOf(last.rect) + this.shiftOf(last.element);
		return bottom + this.shiftOf(group.element) + ROW_GAP_PX;
	}

	private topBefore(before: MeasuredUnit): number {
		const margin = before.kind === "group" ? this.layout.groupMargin : 0;
		return before.rect.top - margin + this.shiftOf(before.element) - this.step;
	}

	private listTailTopOf(units: readonly MeasuredUnit[]): number {
		const last = units.at(-1);

		if (last === undefined) {
			return (this.layout.list?.top ?? 0) + this.shifts.scroller;
		}

		return bottomOf(last.rect) + this.shiftOf(last.element) + ROW_GAP_PX;
	}

	private shiftOf(element: HTMLElement): number {
		return (this.shifts.moves.get(element)?.[1] ?? 0) + this.shifts.scroller;
	}
}

function rowRectAt(column: Pick<Rect, "left" | "width">, top: number): Rect {
	return {
		left: column.left,
		top,
		width: column.width,
		height: ROW_HEIGHT_PX,
	};
}
