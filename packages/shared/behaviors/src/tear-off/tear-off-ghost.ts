import { isOutsideWindow } from "../held-drag/held-pointer.js";
import { DragGhost } from "./drag-ghost.js";
import type { GhostAsk, GhostShape } from "./drag-ghost.js";
import { OverlayGhost } from "./overlay-ghost.js";
import type { OverlayPort } from "./overlay-ghost.js";

export type WindowZone = "inside" | "edge" | "outside";

export interface TearOffGhostAsk extends GhostAsk {
	readonly name: string;
	readonly overlay: OverlayPort | null;
}

const EDGE_ZONE_PX = 40;
const DRAG_OUT = "Drag out to open in a new window";
const RELEASE_OUT = "Release to open in a new window";

export class TearOffGhost {
	private readonly ghost: DragGhost;
	private overlay: OverlayGhost | null = null;
	private pointer: readonly [number, number] = [0, 0];

	constructor(private readonly ask: TearOffGhostAsk) {
		this.ghost = new DragGhost(ask);
	}

	start(x: number, y: number): void {
		this.pointer = [x, y];
		this.ghost.follow(x, y);

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
		this.pointer = [x, y];
		this.ghost.follow(x, y);
		const zone = windowZoneOf(x, y);

		if (mayTearOff && this.canTearOff() && zone !== "inside") {
			this.reshape("card", zone === "outside" ? RELEASE_OUT : DRAG_OUT);
		} else {
			this.reshape(listShape, "");
		}

		const isTaken = this.overlay?.takesOver(this.ghost.rectAt(...this.pointer)) ?? false;
		this.ghost.show(!isTaken);
		return zone;
	}

	canTearOff(): boolean {
		return this.overlay?.isReady() ?? false;
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

function windowZoneOf(x: number, y: number): WindowZone {
	if (isOutsideWindow(x, y)) {
		return "outside";
	}

	const edgeGap = Math.min(x, y, window.innerWidth - x, window.innerHeight - y);
	return edgeGap < EDGE_ZONE_PX ? "edge" : "inside";
}
