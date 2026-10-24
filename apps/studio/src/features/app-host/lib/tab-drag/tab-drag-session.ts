import { isPointInBox } from "@widgetarium/behaviors";
import type { TabDrop } from "@widgetarium/app-host";
import { BoardCarry } from "./board-carry.js";
import { DraggedLook } from "./dragged-look.js";
import { shiftsOf } from "./drop-shifts.js";
import { LayoutShifts } from "./layout-shifts.js";
import type { PickedItem } from "./picked-item.js";
import { dropOf, isSameDrop, isStill, stillDropOf } from "./sidebar-drop-plan.js";
import type { DragSource } from "./sidebar-drop-plan.js";
import { measuredLayoutOf } from "./sidebar-layout.js";
import type { SidebarLayout } from "./sidebar-layout.js";

export type OnTabDrop = (source: DragSource, drop: TabDrop) => Promise<boolean>;

export interface TabDragAsk {
	readonly holder: HTMLElement;
	readonly picked: PickedItem;
	readonly onDrop: OnTabDrop;
	readonly onTearOff: (tabId: string) => void;
}

export const DRAG_MOVE = "move";

const SETTLE_MS = 200;
const COMMIT_WAIT_MS = 400;
const LEAVE_WINDOW_MS = 150;
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
	private drop: TabDrop;
	private isPainted = false;
	private isLanded = false;
	private isEscaped = false;
	private isRunning = false;
	private leaveWindowTimer = 0;
	private pointer: readonly [number, number] = [0, 0];

	constructor(private readonly ask: TabDragAsk) {
		this.layout = measuredLayoutOf(ask.holder);
		this.shifts = new LayoutShifts(this.layout);
		this.look = new DraggedLook(ask.picked.element, ask.holder);
		this.board = new BoardCarry(ask.picked);
		this.drop = stillDropOf(this.layout, ask.picked.source);
	}

	start(): void {
		this.isRunning = true;
		document.addEventListener("dragover", this.onDragOver, CAPTURED);
		document.addEventListener("dragleave", this.onDragLeave, CAPTURED);
		document.addEventListener("drop", this.onDrop, CAPTURED);
		document.addEventListener("keydown", this.onKeyDown, CAPTURED);
		this.ask.picked.element.addEventListener("dragend", this.onDragEnd);
		this.look.lift();
		this.shifts.animate();
		console.info(`[widgetarium] tab drag of ${this.ask.picked.source.id} none → lifted (native drag started)`);
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
		this.isRunning = false;
		document.removeEventListener("dragover", this.onDragOver, CAPTURED);
		document.removeEventListener("dragleave", this.onDragLeave, CAPTURED);
		document.removeEventListener("drop", this.onDrop, CAPTURED);
		document.removeEventListener("keydown", this.onKeyDown, CAPTURED);
		this.ask.picked.element.removeEventListener("dragend", this.onDragEnd);
		clearTimeout(this.leaveWindowTimer);
		this.look.hearAgain();
	}

	private readonly onKeyDown = (event: KeyboardEvent): void => {
		this.isEscaped ||= event.key === ESCAPE;
	};

	private readonly onDragOver = (event: DragEvent): void => {
		clearTimeout(this.leaveWindowTimer);
		this.pointer = [event.clientX, event.clientY];

		if (this.isOverSidebar()) {
			this.board.leave(...this.pointer);
			this.aim(dropOf(this.layout, this.ask.picked.source, ...this.pointer));
			allowMove(event);
			return;
		}

		this.aim(stillDropOf(this.layout, this.ask.picked.source));

		if (this.board.over(...this.pointer)) {
			allowMove(event);
		}
	};

	private readonly onDragLeave = (event: DragEvent): void => {
		if (event.relatedTarget !== null) {
			return;
		}

		clearTimeout(this.leaveWindowTimer);
		this.leaveWindowTimer = window.setTimeout(() => this.leaveWindow(), LEAVE_WINDOW_MS);
	};

	private readonly onDrop = (event: DragEvent): void => {
		clearTimeout(this.leaveWindowTimer);
		this.pointer = [event.clientX, event.clientY];

		if (this.isOverSidebar()) {
			event.preventDefault();
			void this.landInSidebar();
			return;
		}

		if (!this.board.drop(...this.pointer)) {
			return;
		}

		event.preventDefault();
		this.isLanded = true;
		console.info(`[widgetarium] tab drag of ${this.ask.picked.source.id} lifted → board (a board took the drop)`);
		this.restore();
	};

	private readonly onDragEnd = (): void => {
		this.stop();

		if (this.isLanded) {
			return;
		}

		this.board.leave(...this.pointer);
		this.settleBack();
		this.tearOffIfAllowed();
	};

	private tearOffIfAllowed(): void {
		const { source, opensOwnWindow } = this.ask.picked;

		if (source.kind !== "tab" || !opensOwnWindow) {
			console.info(`[widgetarium] tab drag of ${source.id} lifted → resting (no drop took it)`);
			return;
		}

		if (this.isEscaped) {
			console.info(`[widgetarium] tab drag of ${source.id} lifted → resting (Escape cancelled it)`);
			return;
		}

		console.info(`[widgetarium] tab drag of ${source.id} lifted → host asked to tear off (no drop took it)`);
		this.ask.onTearOff(source.id);
	}

	private leaveWindow(): void {
		this.board.leave(...this.pointer);
		this.aim(stillDropOf(this.layout, this.ask.picked.source));
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
		this.isLanded = true;
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

function allowMove(event: DragEvent): void {
	event.preventDefault();

	if (event.dataTransfer !== null) {
		event.dataTransfer.dropEffect = DRAG_MOVE;
	}
}
