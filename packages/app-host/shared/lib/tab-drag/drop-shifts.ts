import type { TabDrop } from "../../schema/tab-drop.schema.js";
import { columnsDuring, scrollerShiftOf } from "./sidebar-drop-plan.js";
import type { DragSource, ListDrop } from "./sidebar-drop-plan.js";
import { cellRectOf, rowStepOf } from "./sidebar-layout.js";
import type { MeasuredGroup, SidebarLayout } from "./sidebar-layout.js";

export interface Shifts {
	readonly moves: ReadonlyMap<HTMLElement, readonly [number, number]>;
	readonly grows: ReadonlyMap<HTMLElement, number>;
	readonly scroller: number;
	readonly columns: number;
}

export function shiftsOf(layout: SidebarLayout, source: DragSource, drop: TabDrop): Shifts {
	const shifting = new DropShifts(layout, source, drop);
	const columns = columnsDuring(layout, source, drop);
	shifting.shiftUnits();
	shifting.shiftTiles(columns);
	return {
		moves: shifting.moves,
		grows: shifting.grows,
		scroller: scrollerShiftOf(layout, source, drop),
		columns,
	};
}

class DropShifts {
	readonly moves = new Map<HTMLElement, readonly [number, number]>();
	readonly grows = new Map<HTMLElement, number>();
	private readonly step: number;

	constructor(
		private readonly layout: SidebarLayout,
		private readonly source: DragSource,
		private readonly drop: TabDrop,
	) {
		this.step = rowStepOf(layout);
	}

	shiftUnits(): void {
		const sourceTop = this.source.kind === "tab" ? this.topIndexOf(this.source.groupId ?? this.source.id) : -1;
		const dropTop = this.drop.kind === "list" ? this.dropTopIndexOf(this.drop) : -1;
		this.layout.units.forEach((unit, at) => {
			const removed = this.source.kind === "tab" && at > sourceTop ? -this.step : 0;
			const added = dropTop !== -1 && at >= dropTop ? this.step : 0;
			this.moves.set(unit.element, [0, removed + added]);

			if (unit.kind === "group") {
				this.shiftGroupRows(unit);
			}
		});
	}

	shiftTiles(columns: number): void {
		const { grid } = this.layout;
		grid.tiles.forEach((tile, at) => {
			const from = cellRectOf(grid, at, columns);
			const to = cellRectOf(grid, this.tilePlaceOf(at), columns);
			this.moves.set(tile.element, [to.left - from.left, to.top - from.top]);
		});
	}

	private shiftGroupRows(group: MeasuredGroup): void {
		const sourceAt = this.sourceRowAt(group);
		const dropAt = this.dropRowAt(group);
		group.rows.forEach((row, at) => {
			const removed = sourceAt !== -1 && at > sourceAt ? -this.step : 0;
			const added = dropAt !== -1 && at >= dropAt ? this.step : 0;
			this.moves.set(row.element, [0, removed + added]);
		});
		const grown = this.isDropIn(group) && group.isOpen ? this.step : 0;
		this.grows.set(group.element, grown - (sourceAt === -1 ? 0 : this.step));
	}

	private sourceRowAt(group: MeasuredGroup): number {
		if (this.source.kind !== "tab" || this.source.groupId !== group.id) {
			return -1;
		}

		return group.rows.findIndex((row) => row.id === this.source.id);
	}

	private dropRowAt(group: MeasuredGroup): number {
		const { drop } = this;

		if (drop.kind !== "list" || drop.groupId !== group.id || drop.before === null) {
			return -1;
		}

		return group.rows.findIndex((row) => row.id === drop.before);
	}

	private isDropIn(group: MeasuredGroup): boolean {
		return this.drop.kind === "list" && this.drop.groupId === group.id;
	}

	private tilePlaceOf(at: number): number {
		const kept = this.source.kind === "essential" && at > this.source.at ? at - 1 : at;
		return this.drop.kind === "essentials" && kept >= this.drop.at ? kept + 1 : kept;
	}

	private topIndexOf(id: string): number {
		return this.layout.units.findIndex((unit) => unit.id === id);
	}

	private dropTopIndexOf(drop: ListDrop): number {
		if (drop.groupId !== null) {
			return this.topIndexOf(drop.groupId) + 1;
		}

		return drop.before === null ? -1 : this.topIndexOf(drop.before);
	}
}
