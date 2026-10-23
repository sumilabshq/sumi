import type { FrameSide, FrameSides, SideLook } from "../schema/frame-sides.schema.js";

const ALLOWED_TURNS: Readonly<Record<SideLook, readonly SideLook[]>> = {
	docked: ["hidden"],
	hidden: ["docked", "peeking"],
	peeking: ["hidden", "docked"],
};

const TOGGLED: Readonly<Record<SideLook, SideLook>> = {
	docked: "hidden",
	hidden: "docked",
	peeking: "docked",
};

export class FrameSidesStore {
	private readonly watchers = new Set<() => void>();

	constructor(private sides: FrameSides) {}

	now = (): FrameSides => this.sides;

	watch = (changed: () => void): (() => void) => {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	};

	toggle(side: FrameSide): void {
		this.turn(side, TOGGLED[this.sides[side]], "toggle");
	}

	peek(side: FrameSide): void {
		this.turnFrom(side, "hidden", "peeking", "peek");
	}

	conceal(side: FrameSide): void {
		this.turnFrom(side, "peeking", "hidden", "conceal");
	}

	private turnFrom(side: FrameSide, from: SideLook, next: SideLook, reason: string): void {
		const was = this.sides[side];

		if (was !== from) {
			console.info(`[widgetarium] frame side ${side} ${reason} skipped: ${was}`);
			return;
		}

		this.turn(side, next, reason);
	}

	private turn(side: FrameSide, next: SideLook, reason: string): void {
		const was = this.sides[side];

		if (!ALLOWED_TURNS[was].includes(next)) {
			throw new Error(`[widgetarium] frame side ${side} cannot turn ${was} → ${next} (${reason})`);
		}

		console.info(`[widgetarium] frame side ${side} ${was} → ${next} (${reason})`);
		this.sides = {
			...this.sides,
			[side]: next,
		};

		for (const changed of this.watchers) {
			changed();
		}
	}
}
