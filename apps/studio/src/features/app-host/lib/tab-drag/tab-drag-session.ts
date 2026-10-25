import {
	capturePointer,
	isOutsideWindow,
	isPointInBox,
	muteTextSelection,
	releasePointer,
	swallowNextClick,
	TearOffGhost,
} from "@widgetarium/behaviors";
import type { GhostFace, GhostShape, ListSizes, OverlayPort } from "@widgetarium/behaviors";
import type { TabDrop } from "@widgetarium/app-host";
import { BoardCarry } from "./board-carry.js";
import { DraggedLook } from "./dragged-look.js";
import { shiftsOf } from "./drop-shifts.js";
import { LayoutShifts } from "./layout-shifts.js";
import type { PickedItem } from "./picked-item.js";
import { columnsDuring, dropOf, isSameDrop, isStill, stillDropOf } from "./sidebar-drop-plan.js";
import type { DragSource } from "./sidebar-drop-plan.js";
import { TILE_HEIGHT_PX, cellRectOf, measuredLayoutOf, rowStepOf } from "./sidebar-layout.js";
import type { SidebarLayout } from "./sidebar-layout.js";

export type OnTabDrop = (source: DragSource, drop: TabDrop) => Promise<boolean>;

export interface TabDragAsk {
	readonly holder: HTMLElement;
	readonly picked: PickedItem;
	readonly face: GhostFace;
	readonly pointerId: number;
	readonly start: readonly [number, number];
	readonly onDrop: OnTabDrop;
	readonly onTearOff: (tabId: string) => void;
	readonly tearOffGhost: OverlayPort;
}

const DRAG_NAME = "tab drag";
const SETTLE_MS = 200;
const COMMIT_WAIT_MS = 400;
const CAPTURED = true;
const ESCAPE = "Escape";
const COMMIT_WATCH: MutationObserverInit = {
	childList: true,
	subtree: true,
};

export class TabDragSession {
	private readonly layout: SidebarLayout;
	private readonly shifts: LayoutShifts;
	private readonly look: DraggedLook;
	private readonly board: BoardCarry;
	private readonly tearOff: TearOffGhost;
	private drop: TabDrop;
	private isPainted = false;
	private isRunning = false;
	private pointer: readonly [number, number];
	private unmuteSelection: () => void = () => undefined;

	constructor(private readonly ask: TabDragAsk) {
		this.layout = measuredLayoutOf(ask.holder);
		this.shifts = new LayoutShifts(this.layout);
		this.look = new DraggedLook(ask.picked.element, ask.holder);
		this.board = new BoardCarry(ask.picked);
		this.tearOff = new TearOffGhost({
			...ask.face,
			name: ask.picked.source.id,
			shape: shapeOfSource(ask.picked.source),
			sizes: ghostSizesOf(this.layout, ask.picked),
			overlay: isTearable(ask.picked) ? ask.tearOffGhost : null,
		});
		this.drop = stillDropOf(this.layout, ask.picked.source);
		this.pointer = ask.start;
	}

	start(): void {
		const { holder, pointerId } = this.ask;
		this.isRunning = true;
		this.unmuteSelection = muteTextSelection();
		capturePointer(holder, pointerId, DRAG_NAME);
		holder.addEventListener("pointermove", this.onMove);
		holder.addEventListener("pointerup", this.onUp);
		holder.addEventListener("pointercancel", this.onCancel);
		document.addEventListener("keydown", this.onKeyDown, CAPTURED);
		this.look.lift();
		this.shifts.animate();
		this.tearOff.start(...this.pointer);
		console.info(`[widgetarium] tab drag of ${this.ask.picked.source.id} none → lifted (pointer drag started)`);
	}

	abandon(): void {
		if (!this.isRunning) {
			return;
		}

		this.stop();
		this.board.leave(...this.pointer);
		this.restore();
		console.warn(`[widgetarium] tab drag of ${this.ask.picked.source.id} lifted → resting (it never ended)`);
	}

	private stop(): void {
		const { holder, pointerId } = this.ask;
		this.isRunning = false;
		holder.removeEventListener("pointermove", this.onMove);
		holder.removeEventListener("pointerup", this.onUp);
		holder.removeEventListener("pointercancel", this.onCancel);
		document.removeEventListener("keydown", this.onKeyDown, CAPTURED);
		releasePointer(holder, pointerId);
		this.unmuteSelection();
		this.tearOff.stop();
		this.look.hearAgain();
	}

	private readonly onKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== ESCAPE) {
			return;
		}

		event.preventDefault();
		this.cancel("Escape cancelled it");
	};

	private readonly onCancel = (): void => {
		this.cancel("the pointer was cancelled");
	};

	private readonly onMove = (event: PointerEvent): void => {
		this.pointer = [event.clientX, event.clientY];
		const isOverSidebar = this.isOverSidebar();
		const drop = isOverSidebar
			? dropOf(this.layout, this.ask.picked.source, ...this.pointer)
			: stillDropOf(this.layout, this.ask.picked.source);
		this.aim(drop);
		const listShape = isOverSidebar && drop.kind === "essentials" ? "tile" : "row";
		const zone = this.tearOff.carry(...this.pointer, listShape, !isOverSidebar);
		const isTearing = isTearable(this.ask.picked) && zone !== "inside";

		if (isOverSidebar || isTearing || zone === "outside") {
			this.board.leave(...this.pointer);
			return;
		}

		this.board.over(...this.pointer);
	};

	private readonly onUp = (event: PointerEvent): void => {
		this.pointer = [event.clientX, event.clientY];
		this.stop();
		swallowNextClick(this.ask.holder);

		if (this.isOverSidebar()) {
			void this.landInSidebar();
			return;
		}

		if (isOutsideWindow(...this.pointer)) {
			this.board.leave(...this.pointer);
			this.settleBack();
			this.tearOffIfAllowed();
			return;
		}

		this.landOnBoardOrRest();
	};

	private landOnBoardOrRest(): void {
		const { id } = this.ask.picked.source;

		if (this.board.drop(...this.pointer)) {
			console.info(`[widgetarium] tab drag of ${id} lifted → board (a board took the drop)`);
			this.restore();
			return;
		}

		this.settleBack();
		console.info(`[widgetarium] tab drag of ${id} lifted → resting (no drop took it)`);
	}

	private cancel(reason: string): void {
		if (!this.isRunning) {
			return;
		}

		this.stop();
		this.board.leave(...this.pointer);
		this.settleBack();
		console.info(`[widgetarium] tab drag of ${this.ask.picked.source.id} lifted → resting (${reason})`);
	}

	private tearOffIfAllowed(): void {
		const { source, opensOwnWindow } = this.ask.picked;

		if (source.kind !== "tab" || !opensOwnWindow) {
			console.info(`[widgetarium] tab drag of ${source.id} lifted → resting (released outside, no own window)`);
			return;
		}

		console.info(`[widgetarium] tab drag of ${source.id} lifted → host asked to tear off (released outside)`);
		this.ask.onTearOff(source.id);
	}

	private isOverSidebar(): boolean {
		return isPointInBox(this.ask.holder.getBoundingClientRect(), ...this.pointer);
	}

	private aim(drop: TabDrop): void {
		if (this.isPainted && isSameDrop(drop, this.drop)) {
			return;
		}

		this.drop = drop;
		this.isPainted = true;
		this.shifts.paint(shiftsOf(this.layout, this.ask.picked.source, drop));
	}

	private async landInSidebar(): Promise<void> {
		const { source } = this.ask.picked;

		if (isStill(this.layout, source, this.drop)) {
			this.settleBack();
			return;
		}

		const committed = whenChanged(this.ask.holder);
		const isPlaced = await this.ask.onDrop(source, this.drop);

		if (!isPlaced) {
			this.settleBack();
			return;
		}

		await committed;
		console.info(`[widgetarium] tab drag of ${source.id} lifted → placed (dropped in the sidebar)`);
		this.restore();
	}

	private settleBack(): void {
		this.shifts.paint(null);
		setTimeout(() => this.restore(), SETTLE_MS);
	}

	private restore(): void {
		this.shifts.clear();
		this.look.show();
	}
}

function isTearable({ source, opensOwnWindow }: PickedItem): boolean {
	return source.kind === "tab" && opensOwnWindow;
}

function shapeOfSource(source: DragSource): GhostShape {
	return source.kind === "essential" ? "tile" : "row";
}

function ghostSizesOf(layout: SidebarLayout, { element, source }: PickedItem): ListSizes {
	const picked = element.getBoundingClientRect();
	const columns = columnsDuring(layout, source, {
		kind: "essentials",
		at: 0,
	});
	const cell = cellRectOf(layout.grid, 0, columns);
	const rowWidth = source.kind === "tab" ? picked.width : layout.scrollerRect.width;
	return {
		row: {
			width: rowWidth,
			height: source.kind === "tab" ? picked.height : rowStepOf(layout) - 1,
		},
		tile: {
			width: source.kind === "essential" ? picked.width : Math.max(cell.width, TILE_HEIGHT_PX),
			height: TILE_HEIGHT_PX,
		},
	};
}

function whenChanged(holder: HTMLElement): Promise<void> {
	return new Promise((done) => {
		const settle = (): void => {
			observer.disconnect();
			clearTimeout(timer);
			done();
		};
		const observer = new MutationObserver(settle);
		const timer = setTimeout(settle, COMMIT_WAIT_MS);
		observer.observe(holder, COMMIT_WATCH);
	});
}
