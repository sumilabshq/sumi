import type { TabDrop } from "../../schema/tab-drop.schema.js";
import { DragGhost } from "./drag-ghost.js";
import type { GhostShape } from "./drag-ghost.js";
import { landingOf } from "./drop-landing.js";
import { shiftsOf } from "./drop-shifts.js";
import type { Shifts } from "./drop-shifts.js";
import { LayoutShifts } from "./layout-shifts.js";
import { columnsDuring, dropOf, isSameDrop, isStill, stillDropOf } from "./sidebar-drop-plan.js";
import type { DragSource } from "./sidebar-drop-plan.js";
import { ROW_HEIGHT_PX, TILE_HEIGHT_PX, cellWidthOf, listRectOf, measuredLayoutOf, rectOf } from "./sidebar-layout.js";
import type { SidebarLayout, Rect } from "./sidebar-layout.js";

export type OnTabDrop = (source: DragSource, drop: TabDrop) => Promise<boolean>;

export interface PickedItem {
	readonly element: HTMLElement;
	readonly source: DragSource;
}

interface Lifted {
	readonly layout: SidebarLayout;
	readonly ghost: DragGhost;
	readonly from: Rect;
	readonly grab: readonly [number, number];
	drop: TabDrop;
	shifts: Shifts | null;
}

const START_PX = 4;
const SETTLE_MS = 200;
const COMMIT_WAIT_MS = 400;
const COMMIT_WATCH: MutationObserverInit = {
	childList: true,
	subtree: true,
};

export class SidebarDrag {
	private lifted: Lifted | null = null;
	private frame = 0;
	private pointer: readonly [number, number];

	constructor(
		private readonly holder: HTMLElement,
		private readonly picked: PickedItem,
		private readonly onDrop: OnTabDrop,
		private readonly start: readonly [number, number],
	) {
		this.pointer = start;
	}

	isLifted(): boolean {
		return this.lifted !== null;
	}

	move(x: number, y: number): void {
		this.pointer = [x, y];

		if (this.lifted === null && !this.isFarEnough(x, y)) {
			return;
		}

		if (this.frame !== 0) {
			return;
		}

		this.frame = requestAnimationFrame(() => {
			this.frame = 0;
			this.follow();
		});
	}

	async end(): Promise<void> {
		cancelAnimationFrame(this.frame);
		const lifted = this.lifted;

		if (lifted === null) {
			return;
		}

		this.follow();

		if (isStill(lifted.layout, this.picked.source, lifted.drop)) {
			this.giveBack(lifted);
			return;
		}

		await this.land(lifted);
	}

	cancel(): void {
		cancelAnimationFrame(this.frame);

		if (this.lifted !== null) {
			this.giveBack(this.lifted);
		}
	}

	private isFarEnough(x: number, y: number): boolean {
		const [startX, startY] = this.start;
		return Math.hypot(x - startX, y - startY) >= START_PX;
	}

	private lift(): Lifted {
		const layout = measuredLayoutOf(this.holder);
		const from = rectOf(this.picked.element);
		const ghost = ghostOf(this.picked, from);
		this.hidePicked();
		new LayoutShifts(layout).animate();
		return {
			layout,
			ghost,
			from,
			grab: grabOf(this.start, from),
			drop: stillDropOf(layout, this.picked.source),
			shifts: null,
		};
	}

	private follow(): void {
		this.lifted ??= this.lift();
		const lifted = this.lifted;
		const [x, y] = this.pointer;
		const drop = dropOf(lifted.layout, this.picked.source, x, y);
		const size = sizeOf(lifted, this.picked.source, drop);
		lifted.ghost.morph(shapeOf(drop), size);
		lifted.ghost.place(x - lifted.grab[0] * size.width, y - lifted.grab[1] * size.height);

		if (lifted.shifts !== null && isSameDrop(drop, lifted.drop)) {
			return;
		}

		lifted.drop = drop;
		lifted.shifts = shiftsOf(lifted.layout, this.picked.source, drop);
		new LayoutShifts(lifted.layout).paint(lifted.shifts);
	}

	private async land(lifted: Lifted): Promise<void> {
		lifted.ghost.land(this.landingRectOf(lifted), shapeOf(lifted.drop));
		const committed = this.whenCommitted(lifted.layout);
		const isPlaced = await this.onDrop(this.picked.source, lifted.drop);

		if (!isPlaced) {
			this.giveBack(lifted);
			return;
		}

		await committed;
		await waited(SETTLE_MS);
		this.release(lifted);
	}

	private landingRectOf(lifted: Lifted): Rect {
		const { source } = this.picked;
		const shifts = lifted.shifts ?? shiftsOf(lifted.layout, source, lifted.drop);
		return landingOf(lifted.layout, source, lifted.drop, shifts);
	}

	private whenCommitted(layout: SidebarLayout): Promise<void> {
		return new Promise((done) => {
			const settle = (): void => {
				observer.disconnect();
				clearTimeout(timer);
				new LayoutShifts(layout).clear();
				done();
			};
			const observer = new MutationObserver(settle);
			const timer = setTimeout(settle, COMMIT_WAIT_MS);
			observer.observe(this.holder, COMMIT_WATCH);
		});
	}

	private giveBack(lifted: Lifted): void {
		new LayoutShifts(lifted.layout).paint(null);
		lifted.ghost.land(lifted.from, restingShapeOf(this.picked.source));
		setTimeout(() => this.release(lifted), SETTLE_MS);
	}

	private release(lifted: Lifted): void {
		new LayoutShifts(lifted.layout).clear();
		lifted.ghost.remove();
		this.showPicked();
		this.lifted = null;
	}

	private hidePicked(): void {
		this.picked.element.style.visibility = "hidden";
		document.body.style.userSelect = "none";
	}

	private showPicked(): void {
		this.picked.element.style.visibility = "";
		document.body.style.userSelect = "";
	}
}

function ghostOf(picked: PickedItem, from: Rect): DragGhost {
	const art = picked.element.querySelector("svg, img, [data-tab-art]");
	const title = picked.element.getAttribute("aria-label") ?? picked.element.textContent ?? "";
	return new DragGhost(art, title.trim(), from, restingShapeOf(picked.source));
}

function grabOf(start: readonly [number, number], from: Rect): readonly [number, number] {
	const [x, y] = start;
	return [(x - from.left) / from.width, (y - from.top) / from.height];
}

function restingShapeOf(source: DragSource): GhostShape {
	return source.kind === "essential" ? "tile" : "row";
}

function shapeOf(drop: TabDrop): GhostShape {
	return drop.kind === "essentials" ? "tile" : "row";
}

function sizeOf(lifted: Lifted, source: DragSource, drop: TabDrop): Rect {
	const { layout, from } = lifted;

	if (drop.kind === "essentials") {
		return {
			...from,
			width: cellWidthOf(layout.grid, columnsDuring(layout, source, drop)),
			height: TILE_HEIGHT_PX,
		};
	}

	return {
		...from,
		width: listRectOf(layout).width,
		height: ROW_HEIGHT_PX,
	};
}

function waited(ms: number): Promise<void> {
	return new Promise((done) => setTimeout(done, ms));
}
