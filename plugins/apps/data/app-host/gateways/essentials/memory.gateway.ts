import type { KeptEssentials } from "../../shared/schema/essential.schema.js";
import { EssentialsGateway } from "./essentials.gateway.js";

export class MemoryEssentialsGateway extends EssentialsGateway {
	private readonly listeners = new Set<() => void>();

	constructor(private held: KeptEssentials | null) {
		super();
	}

	essentialsLoaded(): Promise<void> {
		return Promise.resolve();
	}

	essentials(): KeptEssentials | null {
		return this.held;
	}

	saveEssentials(essentials: KeptEssentials): void {
		this.held = essentials;
		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	essentialsChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
