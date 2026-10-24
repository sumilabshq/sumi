import type { KeptColumn } from "../../shared/schema/tabs-column.schema.js";
import { TabsColumnGateway } from "./tabs-column.gateway.js";

export class MemoryTabsColumnGateway extends TabsColumnGateway {
	private readonly listeners = new Set<() => void>();

	constructor(private held: KeptColumn) {
		super();
	}

	column(): KeptColumn {
		return this.held;
	}

	saveColumn(column: KeptColumn): void {
		this.held = column;
		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	columnChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}
}
