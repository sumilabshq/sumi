import {
	CARRIED_CHAT,
	TearOffGhost,
	announceCarry,
	capturePointer,
	isOutsideWindow,
	isPointInBox,
	muteTextSelection,
	releasePointer,
	swallowNextClick,
} from "@widgetarium/behaviors";
import type { CarryPhase, OverlayPort } from "@widgetarium/behaviors";
import type { ChatPlace } from "@widgetarium/workspaces";

export type ChatTarget = ChatPlace["to"];

export type ChatListKey = ChatTarget["list"];

export interface ChatDragAsk {
	readonly holder: HTMLElement;
	readonly row: HTMLElement;
	readonly id: string;
	readonly title: string;
	readonly isPinned: boolean;
	readonly pointerId: number;
	readonly start: readonly [number, number];
	readonly onPlace: (to: ChatTarget) => void;
	readonly onTakenByBoard: () => void;
	readonly onTearOff: () => void;
	readonly onEnd: () => void;
	readonly overlay: OverlayPort;
}

const DRAG_NAME = "chat drag";
const COLUMN_SELECTOR = "[data-shell-column]";
const CHAT_ROW_SELECTOR = "[data-ws-chat]";
const SECTION_SELECTOR = "[data-ws-list]";
const LIFTED_KEY = "wsLifted";
const DROP_KEY = "wsDrop";
const ESCAPE = "Escape";
const LINE_PX = 2;
const LINE_INSET_PX = 8;

export class ChatDrag {
	private readonly ghost: TearOffGhost;
	private readonly line: HTMLElement;
	private pointer: readonly [number, number];
	private target: ChatTarget | null = null;
	private isOverBoard = false;
	private unmuteSelection: () => void = () => undefined;

	constructor(private readonly ask: ChatDragAsk) {
		const from = ask.row.getBoundingClientRect();
		this.pointer = ask.start;
		const size = {
			width: from.width,
			height: from.height,
		};
		this.ghost = new TearOffGhost({
			art: null,
			title: ask.title,
			grabOffset: [ask.start[0] - from.left, ask.start[1] - from.top],
			name: ask.id,
			shape: "row",
			sizes: {
				row: size,
				tile: size,
			},
			overlay: ask.overlay,
		});
		this.line = createDropLine();
	}

	start(): void {
		const { holder, pointerId, row } = this.ask;
		this.unmuteSelection = muteTextSelection();
		capturePointer(holder, pointerId, DRAG_NAME);
		holder.addEventListener("pointermove", this.onMove);
		holder.addEventListener("pointerup", this.onUp);
		holder.addEventListener("pointercancel", this.onCancel);
		document.addEventListener("keydown", this.onKeyDown, true);
		document.body.append(this.line);
		row.dataset[LIFTED_KEY] = "";
		this.ghost.start(...this.pointer);
		console.info(`[widgetarium] chat drag of ${this.ask.id} none → lifted`);
	}

	private readonly onMove = (event: PointerEvent): void => {
		this.pointer = [event.clientX, event.clientY];
		const isInColumn = this.isInColumn();
		const zone = this.ghost.carry(...this.pointer, "row", !isInColumn);

		if (isInColumn) {
			this.announceToBoard("leave");
			this.aim(this.targetAt(this.pointer[1]));
			return;
		}

		this.aim(null);

		if (zone !== "inside" && this.ghost.canTearOff()) {
			this.announceToBoard("leave");
			return;
		}

		this.isOverBoard = this.announceToBoard("over");
	};

	private readonly onUp = (event: PointerEvent): void => {
		this.pointer = [event.clientX, event.clientY];
		const { target } = this;
		this.stop();
		swallowNextClick(this.ask.holder);

		if (isOutsideWindow(...this.pointer) && this.ghost.canTearOff()) {
			this.announceToBoard("leave");
			console.info(`[widgetarium] chat drag of ${this.ask.id} lifted → its own window (released outside)`);
			this.ask.onTearOff();
			return;
		}

		if (this.isOverBoard && !this.isInColumn()) {
			this.landOnBoard();
			return;
		}

		if (target === null) {
			console.info(`[widgetarium] chat drag of ${this.ask.id} lifted → resting (no change)`);
			return;
		}

		console.info(`[widgetarium] chat drag of ${this.ask.id} lifted → ${target.list} (dropped in the column)`);
		this.ask.onPlace(target);
	};

	private readonly onCancel = (): void => {
		this.stop();
		this.announceToBoard("leave");
		console.info(`[widgetarium] chat drag of ${this.ask.id} lifted → resting (cancelled)`);
	};

	private readonly onKeyDown = (event: KeyboardEvent): void => {
		if (event.key !== ESCAPE) {
			return;
		}

		event.preventDefault();
		this.onCancel();
	};

	private landOnBoard(): void {
		if (!this.announceToBoard("drop")) {
			console.info(`[widgetarium] chat drag of ${this.ask.id} lifted → resting (no board took it)`);
			return;
		}

		console.info(`[widgetarium] chat drag of ${this.ask.id} lifted → board (a pane took it)`);
		this.ask.onTakenByBoard();
	}

	private stop(): void {
		const { holder, pointerId, row } = this.ask;
		holder.removeEventListener("pointermove", this.onMove);
		holder.removeEventListener("pointerup", this.onUp);
		holder.removeEventListener("pointercancel", this.onCancel);
		document.removeEventListener("keydown", this.onKeyDown, true);
		releasePointer(holder, pointerId);
		this.unmuteSelection();
		this.aim(null);
		this.ghost.stop();
		this.line.remove();
		delete row.dataset[LIFTED_KEY];
		this.ask.onEnd();
	}

	private isInColumn(): boolean {
		const column = this.ask.holder.closest(COLUMN_SELECTOR) ?? this.ask.holder;
		return isPointInBox(column.getBoundingClientRect(), ...this.pointer);
	}

	private targetAt(y: number): ChatTarget | null {
		const pinned = this.sectionOf("pinned");
		const recents = this.sectionOf("recents");

		if (pinned !== null && (recents === null || y < recents.getBoundingClientRect().top)) {
			return {
				list: "pinned",
				before: this.pinnedBefore(pinned, y),
			};
		}

		return this.ask.isPinned ? { list: "recents" } : null;
	}

	private pinnedBefore(pinned: HTMLElement, y: number): string | null {
		const below = this.rowsIn(pinned).find((row) => y < middleOf(row.getBoundingClientRect()));
		return below?.dataset["wsChat"] ?? null;
	}

	private aim(target: ChatTarget | null): void {
		this.target = target;
		this.sections().forEach((section) => delete section.dataset[DROP_KEY]);
		this.line.hidden = true;
		const section = target === null ? null : this.sectionOf(target.list);

		if (target === null || section === null) {
			return;
		}

		section.dataset[DROP_KEY] = target.list;

		if (target.list === "pinned") {
			this.placeLine(section, target.before);
		}
	}

	private placeLine(section: HTMLElement, before: string | null): void {
		const area = section.getBoundingClientRect();
		Object.assign(this.line.style, {
			left: `${area.left + LINE_INSET_PX}px`,
			width: `${area.width - LINE_INSET_PX * 2}px`,
			top: `${this.lineTopIn(section, before) - LINE_PX / 2}px`,
		});
		this.line.hidden = false;
	}

	private lineTopIn(section: HTMLElement, before: string | null): number {
		const rows = this.rowsIn(section);
		const anchor = before === null ? undefined : rows.find((row) => row.dataset["wsChat"] === before);

		if (anchor !== undefined) {
			return anchor.getBoundingClientRect().top;
		}

		const last = rows.at(-1) ?? section.firstElementChild;
		return last?.getBoundingClientRect().bottom ?? section.getBoundingClientRect().top;
	}

	private rowsIn(section: HTMLElement): readonly HTMLElement[] {
		return [...section.querySelectorAll<HTMLElement>(CHAT_ROW_SELECTOR)].filter((row) => row !== this.ask.row);
	}

	private sections(): readonly HTMLElement[] {
		return [...this.ask.holder.querySelectorAll<HTMLElement>(SECTION_SELECTOR)];
	}

	private sectionOf(list: ChatListKey): HTMLElement | null {
		return this.sections().find((section) => section.dataset["wsList"] === list) ?? null;
	}

	private announceToBoard(phase: CarryPhase): boolean {
		if (phase === "leave") {
			if (!this.isOverBoard) {
				return false;
			}

			this.isOverBoard = false;
		}

		return announceCarry({
			phase,
			item: {
				kind: CARRIED_CHAT,
				id: this.ask.id,
				title: this.ask.title,
			},
			x: this.pointer[0],
			y: this.pointer[1],
		});
	}
}

function createDropLine(): HTMLElement {
	const line = document.createElement("div");
	line.className = "wg-ws-drop-line";
	line.setAttribute("aria-hidden", "true");
	line.hidden = true;
	return line;
}

function middleOf(box: DOMRect): number {
	return box.top + box.height / 2;
}
