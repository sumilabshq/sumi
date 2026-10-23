import type { PxMemory } from "@widgetarium/behaviors";
import type { FrameEdge } from "../../shared/schema/frame-widths.schema.js";
import { FrameWidthsGateway } from "./frame-widths.gateway.js";

export type FrameMemories = Readonly<Record<FrameEdge, PxMemory>>;

export class PxMemoryFrameWidthsGateway extends FrameWidthsGateway {
	constructor(private readonly memories: FrameMemories) {
		super();
	}

	read(edge: FrameEdge): number | null {
		return this.memories[edge].read();
	}

	keep(edge: FrameEdge, px: number): void {
		this.memories[edge].write(px);
	}
}
