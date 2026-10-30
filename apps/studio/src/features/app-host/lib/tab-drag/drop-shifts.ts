import type { TabDrop } from "@widgetarium/app-host";
import { columnsDuring, scrollerShiftOf } from "./sidebar-drop-plan.js";
import type { DragSource, ListDrop } from "./sidebar-drop-plan.js";
import { cellRectOf, rowStepOf } from "./sidebar-layout.js";
import type { MeasuredGroup, MeasuredList, Rect, SidebarLayout } from "./sidebar-layout.js";

interface FlowItem {
	readonly element: HTMLElement;
	readonly unitId: string | null;
	readonly list: string;
	readonly top: number;
}

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
	private readonly flow: readonly FlowItem[];

	constructor(
		private readonly layout: SidebarLayout,
		private readonly source: DragSource,
		private readonly drop: TabDrop,
	) {
		this.step = rowStepOf(layout);
		this.flow = flowOf(layout);
	}

	shiftUnits(): void {
		const sourceTop = this.source.kind === "tab" ? this.flowIndexOf(this.source.groupId ?? this.source.id) : -1;
		const dropTop = this.drop.kind === "list" ? this.dropFlowIndexOf(this.drop) : -1;
		this.flow.forEach((item, at) => {
			const removed = this.source.kind === "tab" && at > sourceTop ? -this.step : 0;
			const added = dropTop !== -1 && at >= dropTop ? this.step : 0;
			this.moves.set(item.element, [0, removed + added]);
		});

		for (const unit of this.layout.units) {
			if (unit.kind === "group") {
				this.shiftGroupRows(unit);
			}
		}
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

	private flowIndexOf(unitId: string): number {
		return this.flow.findIndex((item) => item.unitId === unitId);
	}

	private dropFlowIndexOf(drop: ListDrop): number {
		if (drop.groupId !== null) {
			return this.flowIndexOf(drop.groupId) + 1;
		}

		if (drop.before !== null) {
			return this.flowIndexOf(drop.before);
		}

		const after = this.flow.map((item) => item.list === drop.list).lastIndexOf(true) + 1;

		if (after === 0) {
			return this.emptyChatFlowIndexOf(drop.list);
		}

		return after === this.flow.length ? -1 : after;
	}

	private emptyChatFlowIndexOf(chatId: string): number {
		const chatRowAt = this.flowIndexOf(chatId);
		const after = chatRowAt + 1;
		return chatRowAt === -1 || after === this.flow.length ? -1 : after;
	}
}

function flowOf(layout: SidebarLayout): readonly FlowItem[] {
	return layout.lists.flatMap((list) => listFlowOf(list)).sort((one, other) => one.top - other.top);
}

function listFlowOf(list: MeasuredList): readonly FlowItem[] {
	const head = list.head === null ? [] : [flowItemOf(list.head, null, list.id)];
	return [...head, ...list.units.map((unit) => flowItemOf(unit, unit.id, list.id))];
}

function flowItemOf(
	{ element, rect }: { readonly element: HTMLElement; readonly rect: Rect },
	unitId: string | null,
	list: string,
): FlowItem {
	return {
		element,
		unitId,
		list,
		top: rect.top,
	};
}
