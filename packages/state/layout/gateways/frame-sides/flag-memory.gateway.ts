import type { FlagMemory } from "@widgetarium/behaviors";
import { FrameSideSchema } from "../../shared/schema/frame-sides.schema.js";
import type { FrameSide, FrameSides, SideLook } from "../../shared/schema/frame-sides.schema.js";
import { FrameSidesGateway } from "./frame-sides.gateway.js";

export type SideMemories = Readonly<Record<FrameSide, FlagMemory>>;

export class FlagMemoryFrameSidesGateway extends FrameSidesGateway {
	private readonly listeners = new Set<() => void>();
	private held: FrameSides;

	constructor(
		private readonly memories: SideMemories,
		first: FrameSides,
	) {
		super();
		this.held = {
			left: keptLookOf(memories.left, first.left),
		};
	}

	sides(): FrameSides {
		return this.held;
	}

	saveSides(sides: FrameSides): void {
		for (const side of FrameSideSchema.options) {
			const isHidden = sides[side] !== "docked";

			if ((this.held[side] !== "docked") !== isHidden) {
				this.memories[side].write(isHidden);
			}
		}

		this.held = sides;
		for (const listener of this.listeners) {
			listener();
		}
	}

	sidesChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}

function keptLookOf(memory: FlagMemory, first: SideLook): SideLook {
	const isHidden = memory.read();

	if (isHidden === null) {
		return first;
	}

	return isHidden ? "hidden" : "docked";
}
