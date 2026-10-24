import { z } from "zod";
import type { HeldDoc } from "@widgetarium/behaviors/tauri-store";
import { FrameSideSchema } from "../../shared/schema/frame-sides.schema.js";
import type { FrameSide, FrameSides, SideLook } from "../../shared/schema/frame-sides.schema.js";
import { FrameSidesGateway } from "./frame-sides.gateway.js";

export const KeptSidesSchema = z.object({
	leftHidden: z.boolean().nullable().catch(null),
	rightHidden: z.boolean().nullable().catch(null),
});

export type KeptSides = z.infer<typeof KeptSidesSchema>;

const HIDDEN_KEY: Readonly<Record<FrameSide, keyof KeptSides>> = {
	left: "leftHidden",
	right: "rightHidden",
};

export class TauriFrameSidesGateway extends FrameSidesGateway {
	private readonly listeners = new Set<() => void>();
	private peeking: ReadonlySet<FrameSide> = new Set();

	constructor(
		private readonly settings: HeldDoc<KeptSides>,
		private readonly first: FrameSides,
	) {
		super();
	}

	sides(): FrameSides {
		return {
			left: this.lookOf("left"),
			right: this.lookOf("right"),
		};
	}

	saveSides(sides: FrameSides, reason: string): void {
		const hidden = {
			leftHidden: sides.left !== "docked",
			rightHidden: sides.right !== "docked",
		};
		this.peeking = new Set(FrameSideSchema.options.filter((side) => sides[side] === "peeking"));

		if (FrameSideSchema.options.every((side) => this.settings.now()[HIDDEN_KEY[side]] === hidden[HIDDEN_KEY[side]])) {
			this.listeners.forEach((listener) => listener());
			return;
		}

		this.settings.change(hidden, reason);
		void this.settings.flush();
	}

	sidesChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		const stopWatching = this.settings.watch(listener);
		return () => {
			this.listeners.delete(listener);
			stopWatching();
		};
	}

	private lookOf(side: FrameSide): SideLook {
		if (this.peeking.has(side)) {
			return "peeking";
		}

		const isHidden = this.settings.now()[HIDDEN_KEY[side]];

		if (isHidden === null) {
			return this.first[side];
		}

		return isHidden ? "hidden" : "docked";
	}
}
