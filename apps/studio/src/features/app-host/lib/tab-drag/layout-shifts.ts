import type { Shifts } from "./drop-shifts.js";
import { columnsOf } from "./sidebar-layout.js";
import type { SidebarLayout } from "./sidebar-layout.js";

const DRAG_COLUMNS = "--tabs-drag-columns";
const GROUP_GROW = "--group-grow";
const SHIFT_MOTION = "transform var(--sumi-dur-base) var(--sumi-ease-out)";
const UNMOVED: readonly [number, number] = [0, 0];

export class LayoutShifts {
	constructor(private readonly layout: SidebarLayout) {}

	animate(): void {
		for (const element of this.shiftedElements()) {
			element.style.transition = SHIFT_MOTION;
		}
	}

	paint(shifts: Shifts | null): void {
		this.paintMoves(shifts?.moves);
		this.paintGrows(shifts?.grows);
		this.paintScroller(shifts?.scroller ?? 0);
		this.paintColumns(shifts?.columns ?? null);
	}

	clear(): void {
		const shifted = this.shiftedElements();
		this.layout.grid.element?.style.removeProperty(DRAG_COLUMNS);
		shifted.forEach(settle);
		requestAnimationFrame(() => shifted.forEach(resumeMotion));
	}

	private movedElements(): readonly HTMLElement[] {
		return [
			...this.layout.grid.tiles.map((tile) => tile.element),
			...this.layout.lists.flatMap((list) => list.head?.element ?? []),
			...this.layout.units.flatMap((unit) => [
				unit.element,
				...(unit.kind === "group" ? unit.rows.map((row) => row.element) : []),
			]),
		];
	}

	private shiftedElements(): readonly HTMLElement[] {
		const { scroller } = this.layout;
		return [...this.movedElements(), ...(scroller === null ? [] : [scroller])];
	}

	private paintMoves(moves: Shifts["moves"] | undefined): void {
		for (const element of this.movedElements()) {
			const [x, y] = moves?.get(element) ?? UNMOVED;
			element.style.transform = x === 0 && y === 0 ? "" : `translate3d(${x}px, ${y}px, 0)`;
		}
	}

	private paintGrows(grows: Shifts["grows"] | undefined): void {
		for (const unit of this.layout.units) {
			unit.element.style.setProperty(GROUP_GROW, `${grows?.get(unit.element) ?? 0}px`);
		}
	}

	private paintScroller(shift: number): void {
		const { scroller } = this.layout;

		if (scroller === null) {
			return;
		}

		scroller.style.transform = shift === 0 ? "" : `translate3d(0, ${shift}px, 0)`;
	}

	private paintColumns(columns: number | null): void {
		const grid = this.layout.grid.element;

		if (grid === null) {
			return;
		}

		if (columns === null || columns === columnsOf(this.layout.grid.tiles.length)) {
			grid.style.removeProperty(DRAG_COLUMNS);
			return;
		}

		grid.style.setProperty(DRAG_COLUMNS, String(columns));
	}
}

function settle(element: HTMLElement): void {
	element.style.transition = "none";
	element.style.transform = "";
	element.style.removeProperty(GROUP_GROW);
	element.dataset["tabsSettling"] = "";
}

function resumeMotion(element: HTMLElement): void {
	element.style.transition = "";
	delete element.dataset["tabsSettling"];
}
