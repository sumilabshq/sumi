import { isOutsideWindow } from "../held-drag/held-pointer.js";
import { DragGhost } from "./drag-ghost.js";
import type { GhostAsk, GhostRect, GhostShape } from "./drag-ghost.js";
import { OverlayGhost } from "./overlay-ghost.js";
import type { OverlayPort } from "./overlay-ghost.js";

export type WindowZone = "inside" | "edge" | "outside";

export interface TearOffGhostAsk extends GhostAsk {
	readonly name: string;
	readonly overlay: OverlayPort | null;
}

const EDGE_ZONE_PX = 40;
const NUDGE_MOST_PX = 16;
const RELEASE_OUT = "Release to open in a new window";

export class TearOffGhost {
	private readonly ghost: DragGhost;
	private overlay: OverlayGhost | null = null;
	private isCardShown = false;

	constructor(private readonly ask: TearOffGhostAsk) {
		this.ghost = new DragGhost(ask);
	}

	start(x: number, y: number): void {
		this.ghost.follow(x, y, true);

		if (this.ask.overlay === null) {
			return;
		}

		const overlay = new OverlayGhost(this.ghost, this.ask.overlay);
		this.overlay = overlay;
		void overlay.lay().catch((failure: unknown) => {
			console.warn(`[widgetarium] tear-off ghost of ${this.ask.name} none → none (the overlay did not lay)`, failure);
		});
	}

	carry(x: number, y: number, listShape: GhostShape, mayTearOff: boolean): WindowZone {
		const zone = windowZoneOf(x, y);

		this.isCardShown = mayTearOff && this.canTearOff() && zone !== "inside";

		if (this.isCardShown) {
			this.reshape("card", RELEASE_OUT);
		} else {
			this.reshape(listShape, "");
		}

		const rect = this.ghost.rectAt(x, y);
		const isLeaving = overflowOf(rect) > NUDGE_MOST_PX;
		const isTaken = isLeaving && (this.overlay?.takesOver(rect) ?? false);

		if (!isLeaving) {
			this.overlay?.giveBack();
		}

		this.ghost.follow(x, y, !isLeaving);
		this.ghost.show(!isTaken);
		return zone;
	}

	land(rect: GhostRect, shape: GhostShape, contentStart: number): void {
		this.overlay?.stop();
		this.reshape(shape, "");
		this.ghost.show(true);
		this.ghost.land(rect, contentStart);
	}

	willTearOff(): boolean {
		return this.isCardShown;
	}

	canTearOff(): boolean {
		return this.overlay?.isReady() ?? false;
	}

	fade(): void {
		this.overlay?.stop();
		this.ghost.fadeAway();
	}

	stop(): void {
		this.ghost.remove();
		this.overlay?.stop();
	}

	private reshape(shape: GhostShape, caption: string): void {
		const isWorn = this.ghost.wear(shape);
		const isSaid = this.ghost.say(caption);

		if (isWorn || isSaid) {
			this.overlay?.sync();
		}
	}
}

function overflowOf({ left, top, width, height }: GhostRect): number {
	return Math.max(0, -left, -top, left + width - window.innerWidth, top + height - window.innerHeight);
}

function windowZoneOf(x: number, y: number): WindowZone {
	if (isOutsideWindow(x, y)) {
		return "outside";
	}

	const edgeGap = Math.min(x, y, window.innerWidth - x, window.innerHeight - y);
	return edgeGap < EDGE_ZONE_PX ? "edge" : "inside";
}
