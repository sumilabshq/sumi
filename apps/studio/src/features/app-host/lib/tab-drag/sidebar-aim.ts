import type { TabDrop } from "@widgetarium/app-host";
import type { DragPreview } from "./drag-preview.js";
import type { DragSource } from "./drag-source.js";
import { dropOf, isOverRefusedSlot, isSameDrop, refusedChatOf, slotAboveOf } from "./drop-aim.js";
import type { LaidOutSidebar } from "./laid-out-sidebar.js";
import type { SidebarLayout } from "./sidebar-layout.js";
import { RefusalCue } from "./refusal-cue.js";

export interface SidebarAimAsk {
	readonly holder: HTMLElement;
	readonly source: DragSource;
	readonly preview: DragPreview;
	readonly laidOut: LaidOutSidebar;
	readonly home: TabDrop;
}

interface RefusedSlot {
	readonly drop: TabDrop;
	readonly chatId: string;
}

const OWN_WINDOW: TabDrop = { kind: "own-window" };

export class SidebarAim {
	private readonly refusal = new RefusalCue();
	private refusedSlot: RefusedSlot | null = null;

	constructor(private readonly ask: SidebarAimAsk) {}

	aimAt(x: number, y: number): TabDrop {
		const { holder, source, laidOut, home } = this.ask;

		if (laidOut.isAwaited()) {
			return this.current();
		}

		const layout = laidOut.now(holder);
		const refused = refusedChatOf(layout, source, y);

		if (refused !== undefined) {
			const above = slotAboveOf(layout, refused.id) ?? home;

			if (this.refusedSlot?.chatId !== refused.id) {
				console.info(`[widgetarium] tab drag of ${source.id} aimed → refused (${refused.id} can't hold a chat)`);
			}

			this.refusedSlot = {
				drop: above,
				chatId: refused.id,
			};
			this.write(above, true);
			this.refusal.point(this.chatRowOf(refused.id));
			return above;
		}

		const drop = dropOf(layout, source, {
			x,
			y,
			current: this.current(),
		});
		this.write(drop, true);
		this.refusal.point(this.stillRefusedRowOf(drop, layout, y));
		return drop;
	}

	private stillRefusedRowOf(drop: TabDrop, layout: SidebarLayout, y: number): HTMLElement | null {
		const slot = this.refusedSlot;

		if (slot === null) {
			return null;
		}

		if (!isSameDrop(drop, slot.drop)) {
			return this.unrefused("the drop changed");
		}

		if (!isOverRefusedSlot({ layout, source: this.ask.source, drop, chatId: slot.chatId, y })) {
			return this.unrefused("the pointer left the slot");
		}

		return this.chatRowOf(slot.chatId);
	}

	private unrefused(reason: string): null {
		console.info(`[widgetarium] tab drag of ${this.ask.source.id} refused → aimed (${reason})`);
		this.refusedSlot = null;
		return null;
	}

	private chatRowOf(chatId: string): HTMLElement | null {
		return this.ask.holder.querySelector<HTMLElement>(`[data-tabs-item="tab"][data-tabs-id="${CSS.escape(chatId)}"]`);
	}

	aimAway(): TabDrop {
		this.refusedSlot = null;
		this.write(OWN_WINDOW, false);
		this.refusal.point(null);
		return OWN_WINDOW;
	}

	aimHome(): TabDrop {
		this.refusedSlot = null;
		this.write(this.ask.home, false);
		this.refusal.point(null);
		return this.ask.home;
	}

	current(): TabDrop {
		return this.ask.preview.now()?.drop ?? this.ask.home;
	}

	isStill(): boolean {
		return isSameDrop(this.current(), this.ask.home);
	}

	remove(): void {
		this.refusal.remove();
	}

	private write(drop: TabDrop, isMarked: boolean): void {
		if (this.ask.preview.aim(drop, isMarked)) {
			this.ask.laidOut.await();
		}
	}
}
