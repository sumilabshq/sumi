import type { RecentSite } from "../../shared/schema/browser-tab.schema.js";
import { RecentSitesGateway } from "./recent-sites.gateway.js";

export class MemoryRecentSitesGateway extends RecentSitesGateway {
	private readonly watchers = new Set<() => void>();
	private kept: readonly RecentSite[] = [];

	sites(): readonly RecentSite[] {
		return this.kept;
	}

	watch(changed: () => void): () => void {
		this.watchers.add(changed);
		return () => void this.watchers.delete(changed);
	}

	keep(sites: readonly RecentSite[]): void {
		this.kept = sites;
		for (const changed of [...this.watchers]) {
			changed();
		}
	}
}
