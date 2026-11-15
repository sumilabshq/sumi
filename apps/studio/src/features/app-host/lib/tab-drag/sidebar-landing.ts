import type { GhostShape, TearOffGhost } from "@widgetarium/behaviors";
import type { TabDrop } from "@widgetarium/app-host/contract";
import type { DragPreview } from "./drag-preview.js";
import type { DragSource } from "./drag-source.js";
import { placeholderRectOf } from "./drag-placeholder.js";
import type { LaidOutSidebar } from "./laid-out-sidebar.js";
import type { SidebarAim } from "./sidebar-aim.js";
import { scrolledOf } from "./sidebar-layout.js";
import { contentStartOf } from "./sidebar-measure.js";
import type { Rect } from "./sidebar-layout.js";

export type OnTabDrop = (source: DragSource, drop: TabDrop) => void;

export interface SidebarLandingAsk {
	readonly holder: HTMLElement;
	readonly source: DragSource;
	readonly preview: DragPreview;
	readonly laidOut: LaidOutSidebar;
	readonly aim: SidebarAim;
	readonly ghost: TearOffGhost;
}

interface Slot {
	readonly rect: Rect;
	readonly shape: GhostShape;
	readonly contentStart: number;
}

const GLIDE_MS = 120;
const NO_LIFT = 0;

export class SidebarLanding {
	private lift = NO_LIFT;

	constructor(private readonly ask: SidebarLandingAsk) {}

	follow(lift: number): void {
		this.lift = lift;
	}

	land(onDrop: OnTabDrop): void {
		const { aim, source } = this.ask;

		if (aim.isStill()) {
			this.settleBack();
			return;
		}

		onDrop(source, aim.current());
		this.startLanding();
		console.info(`[widgetarium] tab drag of ${source.id} lifted → placed (dropped in the sidebar)`);
	}

	settleBack(): void {
		this.ask.aim.aimHome();
		this.startLanding();
	}

	putAway(): void {
		this.rest();
		this.ask.ghost.fade();
	}

	rest(): void {
		this.ask.preview.rest(this.lift);
	}

	private startLanding(): void {
		const { preview, ghost, laidOut } = this.ask;
		preview.land(this.lift, () => ghost.fade());
		laidOut.await();
		this.whenLaidOut(() => this.glideIn());
	}

	private whenLaidOut(then: () => void): void {
		if (!this.ask.laidOut.isAwaited()) {
			then();
			return;
		}

		requestAnimationFrame(() => this.whenLaidOut(then));
	}

	private glideIn(): void {
		const { preview, ghost } = this.ask;

		if (!preview.isShowing(this.lift)) {
			ghost.fade();
			return;
		}

		const slot = this.slotNow();

		if (slot === null) {
			preview.rest(this.lift);
			return;
		}

		ghost.land(slot.rect, slot.shape, slot.contentStart);
		setTimeout(() => preview.rest(this.lift), Math.max(GLIDE_MS, this.ask.laidOut.settlesInMs()));
	}

	private slotNow(): Slot | null {
		const { holder, laidOut, source, aim } = this.ask;
		const layout = laidOut.now(holder);
		const rect = placeholderRectOf(layout, source, aim.current());

		if (rect === null) {
			return null;
		}

		const isTile = layout.grid.tiles.some((tile) => tile.id === source.id);
		const element = holder.querySelector<HTMLElement>(`[data-tabs-item][data-tabs-id="${CSS.escape(source.id)}"]`);
		return {
			rect: isTile ? rect : { ...rect, top: rect.top - scrolledOf(layout) },
			shape: isTile ? "tile" : "row",
			contentStart: element === null ? 0 : contentStartOf(element),
		};
	}
}
