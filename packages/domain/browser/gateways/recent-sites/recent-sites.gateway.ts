import type { RecentSite } from "../../shared/schema/browser-tab.schema.js";

export abstract class RecentSitesGateway {
	abstract recentSites(): readonly RecentSite[];
	abstract recentSitesChanged(listener: () => void): () => void;
	abstract saveRecentSites(sites: readonly RecentSite[]): void;
}
