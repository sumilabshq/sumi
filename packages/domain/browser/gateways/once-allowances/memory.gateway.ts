import type { OnceAllowance } from "../../shared/schema/site-access.schema.js";
import { OnceAllowancesGateway } from "./once-allowances.gateway.js";

export class MemoryOnceAllowancesGateway extends OnceAllowancesGateway {
	private readonly listeners = new Set<() => void>();
	private kept: readonly OnceAllowance[] = [];

	onceAllowances(): readonly OnceAllowance[] {
		return this.kept;
	}

	onceAllowancesChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	saveOnceAllowances(allowances: readonly OnceAllowance[]): void {
		this.kept = allowances;
		for (const changed of [...this.listeners]) {
			changed();
		}
	}
}
