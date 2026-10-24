import type { RecentSite } from "../../shared/schema/browser-tab.schema.js";
import { RecentSitesGateway } from "./recent-sites.gateway.js";

export class MemoryRecentSitesGateway extends RecentSitesGateway {
	private readonly listeners = new Set<() => void>();
	private kept: readonly RecentSite[] = [];

	recentSites(): readonly RecentSite[] {
		return this.kept;
	}

	recentSitesChanged(listener: () => void): () => void {
		this.listeners.add(listener);
		return () => void this.listeners.delete(listener);
	}

	saveRecentSites(sites: readonly RecentSite[]): void {
		this.kept = sites;
		for (const changed of [...this.listeners]) {
			changed();
		}
	}
}
