import type { PxMemory } from "./px-memory.js";

export interface EdgeBounds {
	readonly leastPx: number;
	readonly usualPx: number;
	readonly keptBesidePx: number;
}

export class EdgeWidth {
	private readonly listeners = new Set<() => void>();
	private px: number;

	constructor(
		private readonly name: string,
		private readonly bounds: EdgeBounds,
		private readonly memory: PxMemory,
	) {
		this.px = edgePxFloored(memory.read() ?? bounds.usualPx, bounds);
	}

	now = (): number => this.px;

	subscribe = (changed: () => void): (() => void) => {
		this.listeners.add(changed);
		return () => void this.listeners.delete(changed);
	};

	resize = (asked: number, roomPx: number): void => {
		this.settleAt(edgePxWithin(asked, roomPx, this.bounds), "resize");
	};

	reset = (): void => {
		this.settleAt(this.bounds.usualPx, "reset");
	};

	private settleAt(next: number, reason: string): void {
		if (next === this.px) {
			return;
		}

		console.debug(`[widgetarium] ${this.name} ${this.px}px → ${next}px (${reason})`);
		this.px = next;
		this.memory.write(next);
		for (const changed of this.listeners) {
			changed();
		}
	}
}

function edgePxWithin(px: number, roomPx: number, bounds: EdgeBounds): number {
	return edgePxFloored(Math.min(px, roomPx - bounds.keptBesidePx), bounds);
}

function edgePxFloored(px: number, { leastPx }: EdgeBounds): number {
	return Math.round(Math.max(leastPx, px));
}
