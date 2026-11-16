import type { PinsMove } from "../../shared/lib/pin-edits.js";
import type { Pin } from "../../shared/schema/pins.schema.js";
import { PinsGateway } from "./pins.gateway.js";
import type { MovePins } from "./pins.gateway.js";

export class MemoryPinsGateway extends PinsGateway {
	private held: readonly Pin[] = [];
	private readonly listeners = new Set<() => void>();

	override pins(): Promise<readonly Pin[]> {
		return Promise.resolve(this.held);
	}

	override movePins(move: MovePins): Promise<PinsMove | null> {
		const moved = move(this.held);

		if (moved === null) {
			return Promise.resolve(null);
		}

		this.held = moved.pins;

		for (const listener of [...this.listeners]) {
			listener();
		}

		return Promise.resolve(moved);
	}

	override pinsChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
