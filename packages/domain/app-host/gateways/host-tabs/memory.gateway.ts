import type { KeptTabs } from "../../shared/schema/tabs-session.schema.js";
import { HostTabsGateway } from "./host-tabs.gateway.js";

export class MemoryHostTabsGateway extends HostTabsGateway {
	private readonly listeners = new Set<() => void>();

	constructor(private held: KeptTabs | null) {
		super();
	}

	tabsLoaded(): Promise<void> {
		return Promise.resolve();
	}

	tabs(): KeptTabs | null {
		return this.held;
	}

	saveTabs(tabs: KeptTabs): void {
		this.held = tabs;
		for (const listener of [...this.listeners]) {
			listener();
		}
	}

	tabsChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	opensBesideAnother(): boolean {
		return false;
	}

	keepsPagesAcrossStarts(): boolean {
		return true;
	}
}
