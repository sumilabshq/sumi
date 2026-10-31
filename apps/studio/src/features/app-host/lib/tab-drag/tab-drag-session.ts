import {
	capturePointer,
	isOutsideWindow,
	muteTextSelection,
	releasePointer,
	swallowNextClick,
	TearOffGhost,
} from "@widgetarium/behaviors";
import type { GhostFace, ListSizes, OverlayPort, WindowZone } from "@widgetarium/behaviors";
import type { TabDrop } from "@widgetarium/app-host";
import { BoardCarry } from "./board-carry.js";
import { DeafSidebar } from "./deaf-sidebar.js";
import type { DragPreview } from "./drag-preview.js";
import { stillDropOf } from "./drop-aim.js";
import { EdgeScroll } from "./edge-scroll.js";
import type { LaidOutSidebar } from "./laid-out-sidebar.js";
import type { PickedItem } from "./picked-item.js";
import { SidebarAim } from "./sidebar-aim.js";
import type { SidebarAimAsk } from "./sidebar-aim.js";
import { SidebarLanding } from "./sidebar-landing.js";
import type { OnTabDrop, SidebarLandingAsk } from "./sidebar-landing.js";
import { TILE_HEIGHT_PX, cellWidthOf, columnsOf, rowStepOf } from "./sidebar-layout.js";
import type { SidebarLayout } from "./sidebar-layout.js";
import type { TabRef } from "./tab-ref.js";

export type { OnTabDrop } from "./sidebar-landing.js";

export interface TabDragAsk {
	readonly holder: HTMLElement;
	readonly picked: PickedItem;
	readonly face: GhostFace;
	readonly pointerId: number;
	readonly start: readonly [number, number];
	readonly preview: DragPreview;
	readonly laidOut: LaidOutSidebar;
	readonly onDrop: OnTabDrop;
	readonly onTearOff: (source: TabRef) => void;
	readonly tearOffGhost: OverlayPort;
}

const DRAG_NAME = "tab drag";
const CAPTURED = true;
const ESCAPE = "Escape";

export class TabDragSession {
	private readonly deaf: DeafSidebar;
	private readonly board: BoardCarry;
	private readonly tearOff: TearOffGhost;
	private readonly edgeScroll: EdgeScroll;
	private readonly scroller: HTMLElement | null;
	private readonly aim: SidebarAim;
	private readonly landing: SidebarLanding;
	private isRunning = false;
	private pointer: readonly [number, number];
	private recarryTimer = 0;
	private unmuteSelection: () => void = () => undefined;

	constructor(private readonly ask: TabDragAsk) {
		const layout = ask.laidOut.now(ask.holder);
		this.deaf = new DeafSidebar(ask.holder);
		this.board = new BoardCarry(ask.picked);
		this.scroller = layout.scroller;
		this.edgeScroll = new EdgeScroll(layout.scroller);
		this.tearOff = tearOffGhostOf(ask, layout);
		this.aim = new SidebarAim(aimAskOf(ask, layout));
		this.landing = new SidebarLanding(landingAskOf(ask, this.aim, this.tearOff));
		this.pointer = ask.start;
	}

	start(): void {
		const { holder, pointerId, picked, preview } = this.ask;
		this.isRunning = true;
		this.unmuteSelection = muteTextSelection();
		capturePointer(holder, pointerId, DRAG_NAME);
		holder.addEventListener("pointermove", this.onMove);
		holder.addEventListener("pointerup", this.onUp);
		holder.addEventListener("pointercancel", this.onCancel);
		this.scroller?.addEventListener("scroll", this.onScroll);
		document.addEventListener("keydown", this.onKeyDown, CAPTURED);
		this.deaf.deafen();
		this.landing.follow(preview.lift(picked.source, this.aim.current()));
		this.tearOff.start(...this.pointer);
		console.info(`[widgetarium] tab drag of ${picked.source.id} none → lifted (pointer drag started)`);
	}

	abandon(): void {
		if (this.isRunning) {
			this.stop();
			this.board.leave(...this.pointer);
			console.warn(`[widgetarium] tab drag of ${this.ask.picked.source.id} lifted → resting (it never ended)`);
		}

		this.landing.putAway();
		this.aim.remove();
	}

	private stop(): void {
		const { holder, pointerId } = this.ask;
		this.isRunning = false;
		window.clearTimeout(this.recarryTimer);
		holder.removeEventListener("pointermove", this.onMove);
		holder.removeEventListener("pointerup", this.onUp);
		holder.removeEventListener("pointercancel", this.onCancel);
		this.scroller?.removeEventListener("scroll", this.onScroll);
		document.removeEventListener("keydown", this.onKeyDown, CAPTURED);
		releasePointer(holder, pointerId);
		this.unmuteSelection();
		this.edgeScroll.stop();
		this.deaf.hearAgain();
		this.aim.remove();
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
		this.edgeScroll.aim(...this.pointer);
		this.carry();
	};

	private readonly onScroll = (): void => {
		this.carry();
	};

	private carry(): void {
		const isOverSidebar = this.isOverSidebar();
		const [x, y] = this.pointer;
		const drop = this.aimedDrop(isOverSidebar);
		this.recarryWhenSettled();
		const listShape = isOverSidebar && drop.kind === "essentials" ? "tile" : "row";
		const zone = this.tearOff.carry(x, y, listShape, !isOverSidebar);

		if (isOverSidebar || this.isOffBoard(zone)) {
			this.board.leave(x, y);
			return;
		}

		this.board.over(x, y);
	}

	private recarryWhenSettled(): void {
		window.clearTimeout(this.recarryTimer);
		const staleMs = this.ask.laidOut.staleForMs();

		if (!this.isRunning || staleMs === 0) {
			return;
		}

		this.recarryTimer = window.setTimeout(() => this.carry(), staleMs + 1);
	}

	private aimedDrop(isOverSidebar: boolean): TabDrop {
		const [x, y] = this.pointer;

		if (!isOverSidebar) {
			return this.aim.aimAway();
		}

		if (y < this.ask.holder.getBoundingClientRect().top) {
			const current = this.aim.current();
			return current.kind === "own-window" ? this.aim.aimHome() : current;
		}

		return this.aim.aimAt(x, y);
	}

	private isOffBoard(zone: WindowZone): boolean {
		return zone === "outside" || (isTearable(this.ask.picked) && zone !== "inside");
	}

	private readonly onUp = (event: PointerEvent): void => {
		this.pointer = [event.clientX, event.clientY];
		this.stop();
		swallowNextClick(this.ask.holder);

		if (this.isOverSidebar()) {
			void this.landing.land(this.ask.onDrop);
			return;
		}

		this.releaseOffSidebar();
	};

	private releaseOffSidebar(): void {
		if (this.tearOff.willTearOff()) {
			this.tearOffNow();
			return;
		}

		if (isOutsideWindow(...this.pointer)) {
			this.releaseOutside();
			return;
		}

		this.landOnBoardOrRest();
	}

	private releaseOutside(): void {
		this.board.leave(...this.pointer);
		this.landing.settleBack();
		console.info(
			`[widgetarium] tab drag of ${this.ask.picked.source.id} lifted → resting (released outside, no own window)`,
		);
	}

	private tearOffNow(): void {
		const { source } = this.ask.picked;
		this.board.leave(...this.pointer);
		this.landing.rest();
		this.tearOff.stop();

		if (source.kind !== "tab") {
			return;
		}

		console.info(
			`[widgetarium] tab drag of ${source.id} lifted → host asked to tear off (released over the new-window card)`,
		);
		this.ask.onTearOff(source);
	}

	private landOnBoardOrRest(): void {
		const { id } = this.ask.picked.source;

		if (this.board.drop(...this.pointer)) {
			console.info(`[widgetarium] tab drag of ${id} lifted → board (a board took the drop)`);
			this.landing.putAway();
			return;
		}

		this.landing.settleBack();
		console.info(`[widgetarium] tab drag of ${id} lifted → resting (no drop took it)`);
	}

	private cancel(reason: string): void {
		if (!this.isRunning) {
			return;
		}

		this.stop();
		this.board.leave(...this.pointer);
		this.landing.settleBack();
		console.info(`[widgetarium] tab drag of ${this.ask.picked.source.id} lifted → resting (${reason})`);
	}

	private isOverSidebar(): boolean {
		const [x, y] = this.pointer;
		const box = this.ask.holder.getBoundingClientRect();
		return x >= box.left && x <= box.right && y >= 0 && y <= box.bottom;
	}
}

function aimAskOf(ask: TabDragAsk, layout: SidebarLayout): SidebarAimAsk {
	return {
		holder: ask.holder,
		source: ask.picked.source,
		preview: ask.preview,
		laidOut: ask.laidOut,
		home: stillDropOf(layout, ask.picked.source),
	};
}

function landingAskOf(ask: TabDragAsk, aim: SidebarAim, ghost: TearOffGhost): SidebarLandingAsk {
	return {
		holder: ask.holder,
		source: ask.picked.source,
		preview: ask.preview,
		laidOut: ask.laidOut,
		aim,
		ghost,
	};
}

function tearOffGhostOf(ask: TabDragAsk, layout: SidebarLayout): TearOffGhost {
	return new TearOffGhost({
		...ask.face,
		name: ask.picked.source.id,
		shape: ask.picked.source.kind === "essential" ? "tile" : "row",
		sizes: ghostSizesOf(layout, ask.picked),
		overlay: isTearable(ask.picked) ? ask.tearOffGhost : null,
	});
}

function isTearable({ source, opensOwnWindow }: PickedItem): boolean {
	return source.kind === "tab" && opensOwnWindow;
}

function ghostSizesOf(layout: SidebarLayout, { element, source }: PickedItem): ListSizes {
	const picked = element.getBoundingClientRect();
	const tiles = layout.grid.tiles.length + (source.kind === "essential" ? 0 : 1);
	const cellWidth = cellWidthOf(layout.grid, columnsOf(tiles));
	return {
		row: {
			width: source.kind === "essential" ? layout.scrollerRect.width : picked.width,
			height: source.kind === "essential" ? rowStepOf(layout) - 1 : picked.height,
		},
		tile: {
			width: source.kind === "essential" ? picked.width : Math.max(cellWidth, TILE_HEIGHT_PX),
			height: TILE_HEIGHT_PX,
		},
	};
}
