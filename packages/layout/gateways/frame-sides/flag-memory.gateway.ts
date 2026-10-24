import type { FlagMemory } from "@widgetarium/behaviors";
import type { FrameSide } from "../../shared/schema/frame-sides.schema.js";
import { FrameSidesGateway } from "./frame-sides.gateway.js";

export type SideMemories = Readonly<Record<FrameSide, FlagMemory>>;

export class FlagMemoryFrameSidesGateway extends FrameSidesGateway {
	constructor(private readonly memories: SideMemories) {
		super();
	}

	readHidden(side: FrameSide): boolean | null {
		return this.memories[side].read();
	}

	rememberHidden(side: FrameSide, isHidden: boolean): void {
		this.memories[side].write(isHidden);
	}
}
