import { ArrangementSchema } from "../../shared/schema/arrangement.schema.js";
import type { Arrangement } from "../../shared/schema/arrangement.schema.js";
import { ArrangementGateway } from "./arrangement.gateway.js";

export class MemoryArrangementGateway extends ArrangementGateway {
	private held: Arrangement = ArrangementSchema.parse({ setupIds: [], apps: [], hiddenApps: [] });
	private readonly listeners = new Set<() => void>();

	override arrangement(): Promise<Arrangement> {
		return Promise.resolve(this.held);
	}

	override keepArrangement(patch: Partial<Arrangement>): Promise<void> {
		this.held = { ...this.held, ...patch };

		for (const listener of [...this.listeners]) {
			listener();
		}

		return Promise.resolve();
	}

	override arrangementChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
