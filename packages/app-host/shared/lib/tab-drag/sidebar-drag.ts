import { CARRIED_TAB, announceCarry, isPointInBox } from "@widgetarium/behaviors";
import type { CarryPhase } from "@widgetarium/behaviors";
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

export interface TearOffWatch {
	watch(): void;
	stop(): void;
}

export interface PickedItem {
	readonly element: HTMLElement;
	readonly source: DragSource;
	readonly pointerId: number;
	readonly opensOwnWindow: boolean;
	readonly tearOff: TearOffWatch | null;
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
const OWN_WINDOW_DROP: TabDrop = { kind: "own-window" };
const OWN_WINDOW_CARD_WIDTH_PX = 208;
const OWN_WINDOW_CARD_HEIGHT_PX = 156;
const OWN_WINDOW_MARGIN_PX = 8;
const SETTLE_MS = 200;
const COMMIT_WAIT_MS = 400;
const COMMIT_WATCH: MutationObserverInit = {
	childList: true,
	subtree: true,
};

export class SidebarDrag {
	private lifted: Lifted | null = null;
	private isCarriedOut = false;
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
		this.picked.tearOff?.stop();
		cancelAnimationFrame(this.frame);
		const lifted = this.lifted;

		if (lifted === null) {
			return;
		}

		this.follow();

		if (await this.endedOutside(lifted)) {
			return;
		}

		if (isStill(lifted.layout, this.picked.source, lifted.drop)) {
			this.giveBack(lifted);
			return;
		}

		await this.land(lifted);
	}

	private async endedOutside(lifted: Lifted): Promise<boolean> {
		if (lifted.drop.kind === "own-window") {
			this.release(lifted);
			await this.onDrop(this.picked.source, lifted.drop);
			return true;
		}

		if (!this.isCarriedOut || !this.carry("drop")) {
			return false;
		}

		this.isCarriedOut = false;
		this.release(lifted);
		return true;
	}

	endOnPointerLost(): void {
		if (this.lifted?.drop.kind !== "own-window") {
			this.cancel();
			return;
		}

		console.info("[widgetarium] tab drag pointer cancelled → own-window drop (the card promised it)");
		void this.end();
	}

	letGoForOwnWindow(): void {
		cancelAnimationFrame(this.frame);
		this.leaveCarry();

		if (this.lifted !== null) {
			console.info(
				`[widgetarium] tab drag of ${this.picked.source.id} → handed to its own window (the studio lost focus)`,
			);
			this.release(this.lifted);
		}
	}

	cancel(): void {
		this.picked.tearOff?.stop();
		cancelAnimationFrame(this.frame);
		this.leaveCarry();

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
		capturePointer(this.picked);
		this.picked.tearOff?.watch();
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
		const drop = this.dropAt(lifted.layout, x, y);
		this.followCarry(drop, x, y);
		const size = sizeOf(lifted, this.picked.source, drop);
		lifted.ghost.morph(shapeOf(drop), size);
		lifted.ghost.place(...ghostSpotOf(drop, size, [x - lifted.grab[0] * size.width, y - lifted.grab[1] * size.height]));

		if (lifted.shifts !== null && isSameDrop(drop, lifted.drop)) {
			return;
		}

		lifted.drop = drop;
		lifted.shifts = shiftsOf(lifted.layout, this.picked.source, drop);
		new LayoutShifts(lifted.layout).paint(lifted.shifts);
	}

	private dropAt(layout: SidebarLayout, x: number, y: number): TabDrop {
		if (this.picked.opensOwnWindow && isOutsideWindow(x, y)) {
			return OWN_WINDOW_DROP;
		}

		return dropOf(layout, this.picked.source, x, y);
	}

	private followCarry(drop: TabDrop, x: number, y: number): void {
		const isOverAnotherBoard = drop.kind !== "own-window" && !isPointInBox(this.holder.getBoundingClientRect(), x, y);

		if (isOverAnotherBoard) {
			this.isCarriedOut = this.carry("over");
			return;
		}

		this.leaveCarry();
	}

	private leaveCarry(): void {
		if (!this.isCarriedOut) {
			return;
		}

		this.carry("leave");
		this.isCarriedOut = false;
	}

	private carry(phase: CarryPhase): boolean {
		const { source, element } = this.picked;

		if (source.kind !== "tab") {
			return false;
		}

		const [x, y] = this.pointer;
		return announceCarry({
			phase,
			item: {
				kind: CARRIED_TAB,
				id: source.id,
				title: element.textContent?.trim() ?? "",
			},
			x,
			y,
		});
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
		releasePointer(this.picked);
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
	if (drop.kind === "own-window") {
		return "own-window";
	}

	return drop.kind === "essentials" ? "tile" : "row";
}

function isOutsideWindow(x: number, y: number): boolean {
	return x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight;
}

function capturePointer({ element, pointerId }: PickedItem): void {
	try {
		element.setPointerCapture(pointerId);
	} catch (failure) {
		console.warn("[widgetarium] tab drag pointer capture → none (a release outside the window may be lost)", failure);
	}
}

function releasePointer({ element, pointerId }: PickedItem): void {
	if (!element.hasPointerCapture(pointerId)) {
		return;
	}

	element.releasePointerCapture(pointerId);
}

function ghostSpotOf(drop: TabDrop, size: Rect, at: readonly [number, number]): readonly [number, number] {
	if (drop.kind !== "own-window") {
		return at;
	}

	const [left, top] = at;
	return [
		Math.min(Math.max(left, OWN_WINDOW_MARGIN_PX), window.innerWidth - size.width - OWN_WINDOW_MARGIN_PX),
		Math.min(Math.max(top, OWN_WINDOW_MARGIN_PX), window.innerHeight - size.height - OWN_WINDOW_MARGIN_PX),
	];
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

	if (drop.kind === "own-window") {
		return {
			...from,
			width: OWN_WINDOW_CARD_WIDTH_PX,
			height: OWN_WINDOW_CARD_HEIGHT_PX,
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
