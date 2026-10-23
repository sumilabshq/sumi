import type { Starter } from "../schema/starter.schema.js";

export abstract class StarterStore {
	abstract now(): Starter | null;
	abstract watch(changed: () => void): () => void;
	abstract change(next: Starter | null, reason: string): void;
}

export class MemoryStarterStore extends StarterStore {
	private readonly watchers = new Set<() => void>();
	private picked: Starter | null = null;

	override now(): Starter | null {
		return this.picked;
	}

	override watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	override change(next: Starter | null, reason: string): void {
		if (next === this.picked) {
			return;
		}

		const was = this.picked;
		this.picked = next;
		console.debug(`[widgetarium] composer starter ${String(was)} → ${String(next)} (${reason})`);
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}
