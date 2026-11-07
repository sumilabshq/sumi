import type { PlacedTabs } from "../../shared/schema/tabs.schema.js";
import type { MovePlacedTabs } from "../../shared/lib/settling/settling.js";
import { emptyPlacedTabs } from "../../shared/lib/tabs/kept-tabs.js";
import { TabsGateway } from "./tabs.gateway.js";

export class MemoryTabsGateway extends TabsGateway {
	private readonly listeners = new Set<() => void>();
	private held: PlacedTabs;

	constructor(held: PlacedTabs | null = null) {
		super();
		this.held = held ?? emptyPlacedTabs();
	}

	override placedTabs(): Promise<PlacedTabs> {
		return Promise.resolve(this.held);
	}

	override movePlacedTabs<T>(move: MovePlacedTabs<T>): Promise<T> {
		const moved = move(this.held);

		if (moved.next === null) {
			return Promise.resolve(moved.answer);
		}

		this.held = moved.next;
		for (const listener of [...this.listeners]) {
			listener();
		}

		return Promise.resolve(moved.answer);
	}

	override placedTabsChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
