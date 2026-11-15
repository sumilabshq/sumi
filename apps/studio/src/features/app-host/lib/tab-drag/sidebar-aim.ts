import type { TabDrop } from "@widgetarium/app-host/contract";
import type { DragPreview } from "./drag-preview.js";
import type { DragSource } from "./drag-source.js";
import { dropOf } from "./drop-aim.js";
import { isSameDrop } from "./tab-drops.js";
import type { LaidOutSidebar } from "./laid-out-sidebar.js";

export interface SidebarAimAsk {
	readonly holder: HTMLElement;
	readonly source: DragSource;
	readonly preview: DragPreview;
	readonly laidOut: LaidOutSidebar;
	readonly home: TabDrop;
}

const OWN_WINDOW: TabDrop = { kind: "own-window" };

export class SidebarAim {
	constructor(private readonly ask: SidebarAimAsk) {}

	aimAt(x: number, y: number): TabDrop {
		const { holder, source, laidOut } = this.ask;

		if (laidOut.isAwaited()) {
			return this.current();
		}

		const drop = dropOf(laidOut.now(holder), source, {
			x,
			y,
			current: this.current(),
		});
		this.write(drop, true);
		return drop;
	}

	aimAway(): TabDrop {
		this.write(OWN_WINDOW, false);
		return OWN_WINDOW;
	}

	aimHome(): TabDrop {
		this.write(this.ask.home, false);
		return this.ask.home;
	}

	current(): TabDrop {
		return this.ask.preview.now()?.drop ?? this.ask.home;
	}

	isStill(): boolean {
		return isSameDrop(this.current(), this.ask.home);
	}

	private write(drop: TabDrop, isMarked: boolean): void {
		if (this.ask.preview.aim(drop, isMarked)) {
			this.ask.laidOut.await();
		}
	}
}
