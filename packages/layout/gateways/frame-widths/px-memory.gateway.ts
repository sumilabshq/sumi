import type { PxMemory } from "@widgetarium/behaviors";
import { FrameEdgeSchema } from "../../shared/schema/frame-widths.schema.js";
import type { FrameEdge, FrameWidths } from "../../shared/schema/frame-widths.schema.js";
import { FrameWidthsGateway } from "./frame-widths.gateway.js";

export type FrameMemories = Readonly<Record<FrameEdge, PxMemory>>;

export class PxMemoryFrameWidthsGateway extends FrameWidthsGateway {
	private readonly listeners = new Set<() => void>();
	private held: FrameWidths;

	constructor(
		private readonly memories: FrameMemories,
		first: FrameWidths,
	) {
		super();
		this.held = {
			left: memories.left.read() ?? first.left,
			chat: memories.chat.read() ?? first.chat,
		};
	}

	widths(): FrameWidths {
		return this.held;
	}

	saveWidths(widths: FrameWidths): void {
		for (const edge of FrameEdgeSchema.options) {
			if (this.held[edge] !== widths[edge]) {
				this.memories[edge].write(widths[edge]);
			}
		}

		this.held = widths;
		for (const listener of this.listeners) {
			listener();
		}
	}

	widthsChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
