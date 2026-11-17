import type { FrameSide } from "../../shared/schema/frame-sides.schema.js";
import { SidePeeksGateway } from "./side-peeks.gateway.js";

export class MemorySidePeeksGateway extends SidePeeksGateway {
	private readonly listeners = new Set<() => void>();
	private peeking: ReadonlySet<FrameSide> = new Set();

	override isPeeking(side: FrameSide): boolean {
		return this.peeking.has(side);
	}

	override setPeeking(side: FrameSide, isPeeking: boolean): void {
		if (this.peeking.has(side) === isPeeking) {
			return;
		}

		this.peeking = new Set(isPeeking ? [...this.peeking, side] : [...this.peeking].filter((one) => one !== side));
		for (const listener of this.listeners) {
			listener();
		}
	}

	override peeksChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
